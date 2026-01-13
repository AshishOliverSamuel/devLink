package routes

import (
	"github.com/ayushmehta03/devLink-backend/controllers"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)


func PublicRoutes(router *gin.Engine,client *mongo.Client){

	public:=router.Group("/")

	public.GET("/posts", controllers.GetAllPosts(client))
     public.GET("/posts/:slug", controllers.GetPostBySlug(client))

}