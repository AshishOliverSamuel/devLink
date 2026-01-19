package controllers

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)



var upgarder=websocket.Upgrader{
	CheckOrigin: func(r*http.Request) bool{
		return true
	},
}

func ChatWebSocket(client *mongo.Client)gin.HandlerFunc{
	return func(c *gin.Context){
		tokenString,err:=c.Cookie("access_token")

		if err!=nil{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized"})
			return 
		}


		secret:=os.Getenv("JWT_SECRET")


		token,err:=jwt.Parse(tokenString,func(token *jwt.Token)(interface{},error){
			return []byte(secret),nil
		})

		if err!=nil{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Invalid token"});
			return 
		}

		claims:=token.Claims.(jwt.MapClaims)

		userId,_:=bson.ObjectIDFromHex(claims["user_id"].(string))


		
	}
}
