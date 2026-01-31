package controllers

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"time"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)


func SendChatRequest(client *mongo.Client)gin.HandlerFunc{
	return func(c *gin.Context){


		userId,exits:=c.Get("user_id")

		if !exits{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized"})
			return 
		}


		senderId,_:=bson.ObjectIDFromHex(userId.(string))

		var body struct{
			ReceiverID string `json:"receiver_id"`
			Msg string `json:"msg"`
		}

		if err:=c.ShouldBindJSON(&body);err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid input"})
			return 
		}
		if len(strings.TrimSpace(body.Msg)) == 0 {
	c.JSON(http.StatusBadRequest, gin.H{"error": "Message cannot be empty"})
	return
}


		receiverId,err:=bson.ObjectIDFromHex(body.ReceiverID)

		if err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid receiver id"})
			return 
		}
		if senderId==receiverId{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Cannot send message request to self"})
			return 
		}


		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)

		defer cancel()


		chatCollection:=database.OpenCollection("chat_requests",client)


		count,_:=chatCollection.CountDocuments(ctx,bson.M{
			"sender_id":senderId,
			"receiver_id":receiverId,
			"status":"pending",
		})

		if count>0{
			c.JSON(http.StatusConflict,gin.H{"error":"Chat request already sent"})
			return 
		}

		//create request here 

		request:=models.ChatRequest{
			ID: bson.NewObjectID(),
			SenderID: senderId,
			Msg: body.Msg,
			ReceiverID: receiverId,
			Status: "pending",
			CreatedAt: time.Now(),
		}	

		_,err=chatCollection.InsertOne(ctx,request)

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to send message request"})
			return 
		}

		c.JSON(http.StatusCreated,gin.H{"message":"Chat request sent "})

	}
}


func ReceiveChatRequest(client *mongo.Client)gin.HandlerFunc{
	return func(c *gin.Context){


		userId,exists:=c.Get("user_id")
		if !exists{
		c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized"})
		return 

		}

		receiverId,_:=bson.ObjectIDFromHex(userId.(string))

		fmt.Println(receiverId)
		
		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)

		defer cancel()

		chatCollection:=database.OpenCollection("chat_requests",client)



		cursor,err:=chatCollection.Find(ctx,bson.M{
			"receiver_id":receiverId,
			"status": "pending",
		})

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to fetch requests"})
			return 
		}

		defer cursor.Close(ctx)


		var requests []models.ChatRequest

		if err:=cursor.All(ctx,&requests);err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to parse requests"})
			return 
		}

		c.JSON(http.StatusOK,requests)
	}
}


func RespondChatRequest(client *mongo.Client)gin.HandlerFunc{
	return func(c*gin.Context){
		userId,exists:=c.Get("user_id")

		if !exists{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized"})
			return 
		}


		requestId:=c.Param("id")

		reqObjectId,err:=bson.ObjectIDFromHex(requestId)

		if err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid request id"})
			return 
		}

		var body struct{
			Action string `json:"action"`
		}


		if err:=c.ShouldBindJSON(&body);err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid action"})
			return 
		}

		if body.Action!="accept" &&body.Action!="reject"{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid action"})
			return 
		}

		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)
		defer cancel()


		reqCol:=database.OpenCollection("chat_requests",client)
		roomCol:=database.OpenCollection("chat_rooms",client)


		var req models.ChatRequest

		if err:=reqCol.FindOne(ctx,bson.M{"_id":reqObjectId}).Decode(&req);err!=nil{
			c.JSON(http.StatusNotFound,gin.H{"error":"Chat request not found"})
			return 
		}

		receiverID,_:=bson.ObjectIDFromHex(userId.(string))

		if req.ReceiverID!=receiverID{
			c.JSON(http.StatusForbidden,gin.H{"error":"Not allowed"})
			return 
		}


		_,err=reqCol.UpdateOne(ctx,
		bson.M{"_id":reqObjectId},
		bson.M{"$set":bson.M{"status":body.Action}},
		)

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to respond"})
			return 
		}


		if body.Action=="accept"{
			room:=models.ChatRoom{
				ID:bson.NewObjectID(),
				Participants: []bson.ObjectID{
					req.SenderID,
					req.ReceiverID,
				},
				CreatedAt: time.Now(),
			}
			_,err=roomCol.InsertOne(ctx,room)

			if err!=nil{
				c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to create room"})
				return 
			}

			c.JSON(http.StatusOK,gin.H{
				"message":"Chat request accepted",
				"room_id":room.ID.Hex(),
			})
			return 

		}

		c.JSON(http.StatusOK,gin.H{"message":"Chat request rejected"})



	}
}


func ChatHistory(client *mongo.Client) gin.HandlerFunc{
	return func(c *gin.Context){
		userId,exists:=c.Get("user_id")
		if !exists{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized"})
			return 
		}

		roomIDParam:=c.Param("room_id")

		roomID,err:=bson.ObjectIDFromHex(roomIDParam)


		if err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid user id"})
			return 
		}

		userObjId,_:=bson.ObjectIDFromHex(userId.(string))

		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)

		defer cancel()


		roomCol:=database.OpenCollection("chat_rooms",client)

		count,_:=roomCol.CountDocuments(ctx,bson.M{
			"_id":roomID,
			"participants":userObjId,
		})

		if count==0{
			c.JSON(http.StatusForbidden,gin.H{"error":"Not allowed"})
			return 
		}

		msgCol:=database.OpenCollection("messages",client)

		cursor,err:=msgCol.Find(
			ctx,
			bson.M{"room_id":roomID},
			options.Find().SetSort(bson.M{"created_at":1}),
		)

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to fetch message"})
			return 
		}

		defer cursor.Close(ctx)



		var messages []models.Message

		cursor.All(ctx,&messages)

		if messages==nil{
			messages=[]models.Message{}
		}

		c.JSON(http.StatusOK,messages)
	}
}


func MarkSeenMsg(clinet *mongo.Client)gin.HandlerFunc{
	return func(c *gin.Context){
		userId,exists:=c.Get("user_id")

		if !exists{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized"})
			return 
		}

			roomIdParam:=c.Param("room_id")

			roomId,err:=bson.ObjectIDFromHex(roomIdParam)

			if err!=nil{
				c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid room id"})
				return 
			}

			userObjId,_:=bson.ObjectIDFromHex(userId.(string))

			now:=time.Now()


			ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)

			defer cancel()

			msgCol:=database.OpenCollection("messages",clinet)

			_,err=msgCol.UpdateMany(
				ctx,
				bson.M{
					"room_id":roomId,
					"sender_id":bson.M{"$ne":userObjId},
					"seen_at":bson.M{"$exists":false},
				},

				bson.M{
					"$set":bson.M{"seen_at":&now},
				},
			)


			if err!=nil{
				c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to mark seen"})
				return 
			}

			c.JSON(http.StatusOK,gin.H{"message":"Messages marked as seen"})

	}


}