package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/routes"
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


	routes.AuthRoutes(router,client)
	routes.ProtectedRoutes(router,client)
	
	if err:=router.Run(":8080");err!=nil{
		fmt.Println("Failed to start server",err)
	}

}
