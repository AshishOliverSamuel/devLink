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
	"github.com/joho/godotenv"
)

func main() {

	if os.Getenv("ENV") != "production" {
		if err := godotenv.Load(); err != nil {
			log.Println("warning: .env file not found (using system env vars)")
		}
	}

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",
			"https://dev-link-o6lg.vercel.app",
		},
		AllowMethods: []string{
			"GET",
			"POST",
			"PUT",
			"DELETE",
			"OPTIONS",
		},
		AllowHeaders: []string{
			"Content-Type",
			"Authorization",
			"Accept",
			"Origin",
			"Cookie",
			"Upgrade",
			"Connection",
			"Sec-WebSocket-Key",
			"Sec-WebSocket-Version",
			"Sec-WebSocket-Extensions",
		},
		ExposeHeaders: []string{
			"Set-Cookie",
		},
		AllowCredentials: true,
		MaxAge:           12 * 60 * 60, 
	}))

	client := database.Connect()

	defer func() {
		if err := client.Disconnect(context.Background()); err != nil {
			log.Printf("Mongo disconnect error: %v", err)
		}
	}()

	routes.AuthRoutes(router, client)
	routes.PublicRoutes(router, client)
	routes.ProtectedRoutes(router, client)
	routes.WebSocketRoutes(router, client)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server running on port %s", port)

	if err := router.Run(":" + port); err != nil {
		fmt.Println("Failed to start server:", err)
	}
}
