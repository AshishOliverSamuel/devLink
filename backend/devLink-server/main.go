package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",
			"https://dev-link-o6lg.vercel.app", 
		},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	client := database.Connect()
	if client == nil {
		log.Fatal("MongoDB client is nil")
	}

	defer func() {
		if err := client.Disconnect(context.Background()); err != nil {
			log.Fatalf("Failed to disconnect from MongoDB: %v", err)
		}
	}()

	routes.AuthRoutes(router, client)
	routes.ProtectedRoutes(router, client)
	routes.PublicRoutes(router, client)
	routes.WebSocketRoutes(router, client)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	if err := router.Run(":" + port); err != nil {
		fmt.Println("Failed to start server", err)
	}
}
