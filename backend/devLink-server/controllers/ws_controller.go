package controllers

import (
	"context"
	
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



var upgrader=websocket.Upgrader{
	
	CheckOrigin: func(r*http.Request) bool{
		return true
	},
}

var roomClients=make(map[string]map[*websocket.Conn]bool)
var onlineUsers = make(map[string]bool)

func ChatWebSocket(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		tokenCookie, err := c.Request.Cookie("access_token")
		if err != nil {
			conn.Close()
			return
		}

		secret := os.Getenv("JWT_SECRET")
		token, err := jwt.Parse(tokenCookie.Value, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			conn.Close()
			return
		}

		claims := token.Claims.(jwt.MapClaims)
		userID, _ := bson.ObjectIDFromHex(claims["user_id"].(string))

		roomIDParam := c.Param("room_id")
		roomID, err := bson.ObjectIDFromHex(roomIDParam)
		if err != nil {
			conn.Close()
			return
		}

		roomCol := database.OpenCollection("chat_rooms", client)
		count, _ := roomCol.CountDocuments(context.Background(), bson.M{
			"_id":          roomID,
			"participants": userID,
		})

		if count == 0 {
			conn.Close()
			return
		}

		roomKey := roomID.Hex()
		if roomClients[roomKey] == nil {
			roomClients[roomKey] = make(map[*websocket.Conn]bool)
		}
		roomClients[roomKey][conn] = true

		onlineUsers[userID.Hex()] = true

		broadcast(roomKey, gin.H{
			"type":    "user_online",
			"user_id": userID.Hex(),
		})

		defer func() {
			delete(roomClients[roomKey], conn)
			delete(onlineUsers, userID.Hex())

			// update last_seen
			usersCol := database.OpenCollection("users", client)
			now := time.Now()
			usersCol.UpdateOne(
				context.Background(),
				bson.M{"_id": userID},
				bson.M{"$set": bson.M{"last_seen": now}},
			)

			broadcast(roomKey, gin.H{
				"type":      "user_offline",
				"user_id":   userID.Hex(),
				"last_seen": now,
			})

			conn.Close()
		}()

		// 🔁 READ LOOP
		for {
			var payload map[string]interface{}
			if err := conn.ReadJSON(&payload); err != nil {
				break
			}

			switch payload["type"] {

			case "typing":
				broadcast(roomKey, gin.H{
					"type":      "typing",
					"user_id":   userID.Hex(),
					"is_typing": payload["is_typing"],
				})

			case "message":
				content := payload["content"].(string)

				msgCol := database.OpenCollection("messages", client)
				message := models.Message{
					ID:        bson.NewObjectID(),
					RoomID:    roomID,
					SenderID:  userID,
					Content:   content,
					CreatedAt: time.Now(),
				}

				msgCol.InsertOne(context.Background(), message)

				broadcast(roomKey, gin.H{
					"type":        "message",
					"id":          message.ID.Hex(),
					"room_id":     roomKey,
					"sender_id":   userID.Hex(),
					"content":     content,
					"created_at": message.CreatedAt,
				})
			}
		}
	}
}


func broadcast(roomKey string, data gin.H) {
	for conn := range roomClients[roomKey] {
		if err := conn.WriteJSON(data); err != nil {
			conn.Close()
			delete(roomClients[roomKey], conn)
		}
	}
}
