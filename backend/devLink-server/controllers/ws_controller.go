package controllers

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/models"
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

var roomClients=make(map[string]map[*websocket.Conn]bool)

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
			fmt.Println("Invalid token")
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Invalid token"});
			return 
		}

		claims:=token.Claims.(jwt.MapClaims)

		userId,_:=bson.ObjectIDFromHex(claims["user_id"].(string))

		roomIDParam:=c.Param("room_id");

		roomID,err:=bson.ObjectIDFromHex(roomIDParam)


		if err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid room id"});
			fmt.Println("Invalid room id")
			return 
		}


		roomCol:=database.OpenCollection("chat_rooms",client)

		count,_:=roomCol.CountDocuments(context.Background(),bson.M{
			"_id":roomID,
			"participants":userId,
		})

		if count==0{
			fmt.Println("not avilable")
			c.JSON(http.StatusForbidden,gin.H{"error":"Not allowed"})
			return 
		}


		con,err:=upgarder.Upgrade(c.Writer,c.Request,nil)

		if err!=nil{
			return 
		}


		for{
			var msg struct{
				Content string `json:"content"`
			}

			err:=con.ReadJSON(&msg)

			if err!=nil{
				break
			}

			roomKey:=roomID.Hex()

		if roomClients[roomKey]==nil{
			roomClients[roomKey]=make(map[*websocket.Conn]bool)
		}
		roomClients[roomKey][con]=true


			response := gin.H{
	"room_id": roomKey,
	"sender":  userId.Hex(),
	"content": msg.Content,
}

for clientConn := range roomClients[roomKey] {
	err := clientConn.WriteJSON(response)
	if err != nil {
		clientConn.Close()
		delete(roomClients[roomKey], clientConn)
	}
}



			msgCol:=database.OpenCollection("messages",client)

			message:=models.Message{
				ID:bson.NewObjectID(),
				RoomID: roomID,
				SenderID: userId,
				Content: msg.Content,
				CreatedAt: time.Now(),
			}


			_,err=msgCol.InsertOne(context.Background(),message)
			if err!=nil{
				fmt.Println("WS: Failed to save message")
			}
		}

		

	}
}
