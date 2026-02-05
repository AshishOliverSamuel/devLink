package controllers

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/models"
	"github.com/ayushmehta03/devLink-backend/utils"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)



func cookieDomain() string {
	if os.Getenv("ENV") == "production" {
		return ".onrender.com"
	}
	return "" 
}

func setAuthCookie(c *gin.Context, token string) {
	isProd := os.Getenv("ENV") == "production"

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "access_token",
		Value:    token,
		MaxAge:   60 * 60 * 24,
		Path:     "/",
		Domain:   cookieDomain(),
		HttpOnly: true,
		Secure:   isProd,
		SameSite: func() http.SameSite {
			if isProd {
				return http.SameSiteNoneMode
			}
			return http.SameSiteLaxMode
		}(),
	})
}

func clearAuthCookie(c *gin.Context) {
	isProd := os.Getenv("ENV") == "production"

	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		MaxAge:   -1,
		Path:     "/",
		Domain:   cookieDomain(),
		HttpOnly: true,
		Secure:   isProd,
		SameSite: func() http.SameSite {
			if isProd {
				return http.SameSiteNoneMode
			}
			return http.SameSiteLaxMode
		}(),
	})
}




func GenerateOTP() string {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "000000"
	}
	return fmt.Sprintf("%06d", n.Int64())
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}



func RegisterUser(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		var user models.User

		if err := c.ShouldBindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		validate := validator.New()
		if err := validate.Struct(user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Validation failed",
				"details": err.Error(),
			})
			return
		}

		hashedPassword, err := HashPassword(user.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		userCollection := database.OpenCollection("users", client)

		count, err := userCollection.CountDocuments(ctx, bson.M{"email": user.Email})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing user"})
			return
		}

		if count > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
			return
		}

		seed := user.UserName
		if seed == "" {
			seed = user.Email
		}

		avatarURL := fmt.Sprintf(
			"https://api.dicebear.com/7.x/initials/svg?seed=%s",
			url.QueryEscape(seed),
		)

		otp := GenerateOTP()
		otpHash, _ := HashPassword(otp)

		user.UserId = bson.NewObjectID().Hex()
		user.Password = hashedPassword
		user.IsVerified = false
		user.Role = "user"
		user.OTPHash = otpHash
		user.ProfileImage = avatarURL
		user.OTPExpiry = time.Now().Add(10 * time.Minute)
		user.CreatedAt = time.Now()
		user.UpdatedAt = time.Now()

		if _, err := userCollection.InsertOne(ctx, user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register user"})
			return
		}

		if err := utils.SendOTPEmail(user.Email, otp); err != nil {
			log.Println("OTP EMAIL FAILED:", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to send OTP email. Please try again.",
			})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "User registered. OTP sent to email.",
		})
	}
}


func VerifyOtp(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req struct {
			Email string `json:"email"`
			OTP   string `json:"otp"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		userCollection := database.OpenCollection("users", client)

		var user models.User
		if err := userCollection.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		if user.IsVerified {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User already verified"})
			return
		}

		if time.Now().After(user.OTPExpiry) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "OTP expired"})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.OTPHash), []byte(req.OTP)); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid OTP"})
			return
		}

		_, err := userCollection.UpdateOne(ctx, bson.M{"email": req.Email}, bson.M{
			"$set": bson.M{
				"is_verified": true,
				"updated_at":  time.Now(),
			},
			"$unset": bson.M{
				"otp_hash":   "",
				"otp_expiry": "",
			},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Verification failed"})
			return
		}

		token, _ := utils.GenerateToken(user.Id.Hex(), user.Email, user.Role)
		setAuthCookie(c, token)

		c.JSON(http.StatusOK, gin.H{
			"message": "Account verified and logged in",
		})
	}
}


func LoginUser(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		var loginReq models.UserLogin

		if err := c.ShouldBindJSON(&loginReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		userCollection := database.OpenCollection("users", client)

		var user models.User
		if err := userCollection.FindOne(ctx, bson.M{"email": loginReq.Email}).Decode(&user); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No account found with this email"})
			return
		}

		if !user.IsVerified {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Account not verified",
				"code":  "ACCOUNT_NOT_VERIFIED",
				"email": user.Email,
			})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}

		token, _ := utils.GenerateToken(user.Id.Hex(), user.Email, user.Role)
		setAuthCookie(c, token)

		c.JSON(http.StatusOK, gin.H{
			"message": "Login successful",
		})
	}
}


func LogoutUser() gin.HandlerFunc {
	return func(c *gin.Context) {

		isProd := os.Getenv("ENV") == "production"

		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "access_token",
			Value:    "",
			MaxAge:   -1,
			Path:     "/",              
			Domain:   cookieDomain(),   
			HttpOnly: true,
			Secure:   isProd,
			SameSite: func() http.SameSite {
				if isProd {
					return http.SameSiteNoneMode
				}
				return http.SameSiteLaxMode
			}(),
		})

		c.Header("Cache-Control", "no-store")

		c.JSON(http.StatusOK, gin.H{
			"message": "Logged out successfully",
		})
	}
}



func GetMe(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		tokenStr, err := c.Cookie("access_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		claims, err := utils.VerifyToken(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		userObjId, _ := bson.ObjectIDFromHex(claims.UserID)

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		userCollection := database.OpenCollection("users", client)

		var user models.User
		if err := userCollection.FindOne(ctx, bson.M{"_id": userObjId}).Decode(&user); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":            user.Id,
			"username":      user.UserName,
			"email":         user.Email,
			"profile_image": user.ProfileImage,
			"role":          user.Role,
			"created_at":    user.CreatedAt,
		})
	}
}


func ResendOtp(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		var req struct {
			Email string `json:"email" validate:"required,email"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		userCollection := database.OpenCollection("users", client)

		var user models.User
		if err := userCollection.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		if user.IsVerified {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User already verified"})
			return
		}

		newOtp := GenerateOTP()
		hashedOtp, err := HashPassword(newOtp)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP"})
			return
		}

		update := bson.M{
			"$set": bson.M{
				"otp_hash":   hashedOtp,
				"otp_expiry": time.Now().Add(10 * time.Minute),
				"updated_at": time.Now(),
			},
		}

		if _, err := userCollection.UpdateOne(ctx, bson.M{"email": req.Email}, update); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update OTP"})
			return
		}

		if err := utils.SendOTPEmail(user.Email, newOtp); err != nil {
			log.Println("RESEND OTP EMAIL FAILED:", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to send OTP email. Please try again.",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "OTP resent successfully",
		})
	}
}
