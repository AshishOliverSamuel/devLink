package routes

import (
	"github.com/ayushmehta03/devLink-backend/controllers"
	"github.com/ayushmehta03/devLink-backend/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)


func ProtectedRoutes(router *gin.Engine,client *mongo.Client){
	protected:=router.Group("/")

	protected.Use(middleware.AuthMiddleWare())


	protected.POST("/createpost",controllers.CreatePost(client))
	protected.PUT("/updatepost/:id", controllers.UpdatePost(client))
	protected.DELETE("/deletepost/:id",controllers.DeletePost(client))
	protected.GET("/posts/archive",controllers.GetArchivePosts(client))
	protected.GET("/auth/logout", controllers.LogoutUser())
	protected.POST("/chat/request",controllers.SendChatRequest(client))
	protected.GET("/chat/requests",controllers.ReceiveChatRequest(client))
	protected.POST("/chat/request/:id/respond",controllers.RespondChatRequest(client))
	protected.GET("/chat/rooms/:room_id/messages",controllers.ChatHistory(client))
}