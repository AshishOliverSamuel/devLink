package controllers

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)



func GenerateOtp() (string){



	minRange:=0000
	maxRange:=9999
	number:=rand.Intn((maxRange-minRange)+minRange)



	otp:=strconv.Itoa(number)

	return otp;
	



}


func HashPassword(password string) (string,error){
	HashPassword,err:=bcrypt.GenerateFromPassword([]byte(password),bcrypt.DefaultCost)
	if err!=nil{
		return "",err
	}

	return string(HashPassword),nil;
}





func RegisterUser(client *mongo.Client) gin.HandlerFunc{
	return func(c* gin.Context){

		var user models.User

		if err:=c.ShouldBindJSON(&user);err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid input data"})
			return

		}

		validate:=validator.New();

		if err:=validate.Struct(user);err!=nil{
		c.JSON(http.StatusBadRequest,gin.H{"error":"Validation failed","details":err.Error()})
		return
		}

		HashPassword,err:=HashPassword(user.Password)

		if err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Internal server error"})
			return 
		}


		var ctx,cancel=context.WithTimeout(context.Background(),100*time.Second)

		defer cancel();

		var userCollection *mongo.Collection=database.OpenCollection("users",client)

		count,err:=userCollection.CountDocuments(ctx,bson.M{"email":user.Email})

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to check existing user"})
			return
		}

		if count>0{
			c.JSON(http.StatusConflict,gin.H{"error":"User already exists"})
			return
		}

		

		user.UserId=bson.NewObjectID().Hex()
		user.CreatedAt=time.Now()
		user.UpdatedAt=time.Now()
		user.Password=HashPassword
		

		result,err:=userCollection.InsertOne(ctx,user)

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to register error"})
			return
		}

		c.JSON(http.StatusCreated,result);






	}
}

