package auth

import (
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)



func VerifyOtp(client *mongo.Client) gin.HandlerFunc{
	return func(c*gin.Context){


		var req struct{
			Email string `json:"email" validate:"required,email"`
			OTP string `json:"otp" validate:"required"`

		}


		if err:=c.ShouldBindJSON(&req)
	}
}