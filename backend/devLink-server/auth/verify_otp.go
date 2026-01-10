package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)



func VerifyOtp(client *mongo.Client) gin.HandlerFunc{
	return func(c*gin.Context){


		var req struct{
			Email string `json:"email" validate:"required,email"`
			OTP string `json:"otp" validate:"required"`

		}


		if err:=c.ShouldBindJSON(&req);err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"message":"Invalid input "})
			return
		}

		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)


		defer cancel();


		userCollection:=database.OpenCollection("users",client)

		var user models.User

		err:=userCollection.FindOne(ctx,bson.M{"email":req.Email}).Decode(&user)
		

		if err!=nil{
			c.JSON(http.StatusNotFound,gin.H{"error":"No user found"})

		}

		if time.Now().After(user.OTPExpiry){
			c.JSON(http.StatusBadRequest,gin.H{"error":"OTP expired"})
			return
		}


		err=bcrypt.CompareHashAndPassword(
			[]byte(user.OTPHash),
			[]byte(req.OTP),
		)


		if err!=nil{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Invalid otp"})
			return 
		}


		update := bson.M{
			"$set": bson.M{
				"is_verified": true,
				"updated_at":  time.Now(),
			},
			"$unset": bson.M{
				"otp_hash":   "",
				"otp_expiry": "",
			},
		}

		_,err=userCollection.UpdateOne(ctx,bson.M{"email":req.Email},update)

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Verification failed"})
			return 
		}

		c.JSON(http.StatusOK,gin.H{"message":"Account verified successfully"})
		


	}
}