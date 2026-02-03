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

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type ClientInfo struct {
	Conn   *websocket.Conn
	UserID string
}

var roomClients = make(map[string]map[*websocket.Conn]string)

func broadcast(roomKey string, payload gin.H) {
	for conn := range roomClients[roomKey] {
		if err := conn.WriteJSON(payload); err != nil {
			conn.Close()
			delete(roomClients[roomKey], conn)
		}
	}
}

func ChatWebSocket(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		tokenString := c.Query("token")
		secret := os.Getenv("JWT_SECRET")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			conn.Close()
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || claims["type"] != "ws" {
			conn.Close()
			return
		}
		userIDHex := claims["user_id"].(string)
		userID, _ := bson.ObjectIDFromHex(userIDHex)

		roomIDParam := c.Param("room_id")
		roomID, _ := bson.ObjectIDFromHex(roomIDParam)
		roomKey := roomID.Hex()

		roomCol := database.OpenCollection("chat_rooms", client)
		count, _ := roomCol.CountDocuments(context.Background(), bson.M{"_id": roomID, "participants": userID})
		if count == 0 {
			conn.Close()
			return
		}

		if roomClients[roomKey] == nil {
			roomClients[roomKey] = make(map[*websocket.Conn]string)
		}
		roomClients[roomKey][conn] = userIDHex

		for _, existingUserID := range roomClients[roomKey] {
			if existingUserID != userIDHex {
				conn.WriteJSON(gin.H{
					"type":    "user_online",
					"user_id": existingUserID,
				})
			}
		}

		broadcast(roomKey, gin.H{
			"type":    "user_online",
			"user_id": userIDHex,
		})

		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.SetPongHandler(func(string) error {
			conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})

		go func() {
			ticker := time.NewTicker(30 * time.Second)
			defer ticker.Stop()
			for range ticker.C {
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}()

		defer func() {
			delete(roomClients[roomKey], conn)
			now := time.Now()
			usersCol := database.OpenCollection("users", client)
			usersCol.UpdateOne(context.Background(), bson.M{"_id": userID}, bson.M{"$set": bson.M{"last_seen": now}})

			broadcast(roomKey, gin.H{
				"type":      "user_offline",
				"user_id":   userIDHex,
				"last_seen": now,
			})
			conn.Close()
		}()

		for {
			var payload struct {
				Type     string `json:"type"`
				Content  string `json:"content,omitempty"`
				IsTyping bool   `json:"is_typing,omitempty"`
			}
			if err := conn.ReadJSON(&payload); err != nil {
				break
			}

			switch payload.Type {
			case "typing":
				broadcast(roomKey, gin.H{
					"type":      "typing",
					"user_id":   userIDHex,
					"is_typing": payload.IsTyping,
				})
			case "message":
				if payload.Content == "" {
					continue
				}
				msgCol := database.OpenCollection("messages", client)
				message := models.Message{
					ID:        bson.NewObjectID(),
					RoomID:    roomID,
					SenderID:  userID,
					Content:   payload.Content,
					CreatedAt: time.Now(),
				}
				msgCol.InsertOne(context.Background(), message)
				broadcast(roomKey, gin.H{
					"type":       "message",
					"id":         message.ID.Hex(),
					"room_id":    roomKey,
					"sender_id":  userIDHex,
					"content":    message.Content,
					"created_at": message.CreatedAt,
				})
			}
		}
	}
}