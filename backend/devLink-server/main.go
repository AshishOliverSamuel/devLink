package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/gin-contrib/cors"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/routes"
	"github.com/gin-gonic/gin"
)

func main() {

		router:=gin.Default()
	router.Use(cors.New(cors.Config{
     AllowOrigins:     []string{"http://localhost:3000"},
  AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
  AllowHeaders:     []string{"Content-Type", "Authorization"},
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


	routes.AuthRoutes(router,client)
	routes.ProtectedRoutes(router,client)
	routes.PublicRoutes(router,client)
	routes.WebSocketRoutes(router,client)

	port:=os.Getenv("PORT");

	if port==""{
		port="8080"
	}
	
	if err:=router.Run(":8080");err!=nil{
		fmt.Println("Failed to start server",err)
	}


}
