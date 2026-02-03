package controllers

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}


var roomClients = make(map[string]map[*websocket.Conn]bson.ObjectID)

var onlineUsers = make(map[string]int)

var mu sync.Mutex

func ChatWebSocket(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {


		tokenString, err := c.Cookie("access_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		secret := os.Getenv("JWT_SECRET")

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		claims := token.Claims.(jwt.MapClaims)
		userID, _ := bson.ObjectIDFromHex(claims["user_id"].(string))


		roomIDHex := c.Param("room_id")
		roomID, err := bson.ObjectIDFromHex(roomIDHex)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room id"})
			return
		}

		roomCol := database.OpenCollection("chat_rooms", client)
		count, _ := roomCol.CountDocuments(context.Background(), bson.M{
			"_id":          roomID,
			"participants": userID,
		})

		if count == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
			return
		}


		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		roomKey := roomID.Hex()


		mu.Lock()

		if roomClients[roomKey] == nil {
			roomClients[roomKey] = make(map[*websocket.Conn]bson.ObjectID)
		}

		roomClients[roomKey][conn] = userID
		onlineUsers[userID.Hex()]++

		if onlineUsers[userID.Hex()] == 1 {
			broadcastPresence(roomKey, userID.Hex(), "online")
		}

		mu.Unlock()


		defer func() {
			mu.Lock()

			delete(roomClients[roomKey], conn)
			onlineUsers[userID.Hex()]--

			if onlineUsers[userID.Hex()] <= 0 {
				delete(onlineUsers, userID.Hex())
				broadcastPresence(roomKey, userID.Hex(), "offline")
			}

			conn.Close()
			mu.Unlock()
		}()


		for {
			var payload struct {
				Type    string `json:"type"`
				Content string `json:"content"`
			}

			if err := conn.ReadJSON(&payload); err != nil {
				break
			}

			if payload.Type != "message" || payload.Content == "" {
				continue
			}

			message := models.Message{
				ID:        bson.NewObjectID(),
				RoomID:    roomID,
				SenderID:  userID,
				Content:   payload.Content,
				CreatedAt: time.Now(),
			}

			msgCol := database.OpenCollection("messages", client)
			_, err := msgCol.InsertOne(context.Background(), message)
			if err != nil {
				fmt.Println("WS: Failed to save message")
			}

			response := gin.H{
				"type": "message",
				"message": gin.H{
					"id":         message.ID.Hex(),
					"room_id":    roomKey,
					"sender_id":  userID.Hex(),
					"content":    message.Content,
					"created_at": message.CreatedAt,
				},
			}

			broadcastMessage(roomKey, response)
		}
	}
}


func broadcastMessage(roomKey string, payload gin.H) {
	for conn := range roomClients[roomKey] {
		if err := conn.WriteJSON(payload); err != nil {
			conn.Close()
			delete(roomClients[roomKey], conn)
		}
	}
}

func broadcastPresence(roomKey, userID, status string) {
	payload := gin.H{
		"type":   "presence",
		"userId": userID,
		"status": status,
	}

	for conn := range roomClients[roomKey] {
		conn.WriteJSON(payload)
	}
}
