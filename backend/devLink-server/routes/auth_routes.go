package routes

import (
	"github.com/ayushmehta03/devLink-backend/controllers"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)



func AuthRoutes(router *gin.Engine,client *mongo.Client){

	auth:=router.Group("/auth")

	auth.POST("/register",controllers.RegisterUser(client));
	auth.POST("/verify-otp",controllers.VerifyOtp(client));
	auth.POST("/resend-otp",controllers.ResendOtp(client));
	auth.POST("/login",controllers.LoginUser(client));
	auth.GET("/me",controllers.GetMe(client));
	auth.POST("/logout",controllers.LogoutUser())
}