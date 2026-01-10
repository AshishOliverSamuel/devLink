package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ayushmehta03/devLink-backend/auth"
	"github.com/ayushmehta03/devLink-backend/controllers"
	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/gin-gonic/gin"
)

func main() {

		router:=gin.Default()


	client := database.Connect()
	if client == nil {
		log.Fatal("MongoDB client is nil")
	}

	defer func() {
		if err := client.Disconnect(context.Background()); err != nil {
			log.Fatalf("Failed to disconnect from MongoDB: %v", err)
		}
	}()

	router.POST("/register",controllers.RegisterUser(client))
	router.POST("/verify-otp",auth.VerifyOtp(client))
	

	if err:=router.Run(":8080");err!=nil{
		fmt.Println("Failed to start server",err)
	}

}
