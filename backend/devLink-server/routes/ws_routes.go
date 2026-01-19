package routes

import (
	"github.com/ayushmehta03/devLink-backend/controllers"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)


func WebSocketRoutes(router *gin.Engine,client *mongo.Client){
	router.GET("/ws/chat/:roomId",controllers.ChatWebSocket(client))
}