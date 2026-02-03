package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)


type ChatRequest struct{
	ID bson.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	SenderID bson.ObjectID `bson:"sender_id" json:"sender_id"`
	Msg string `bson:"msg,omitempty" json:"msg,omitempty"`
	ReceiverID bson.ObjectID `bson:"receiver_id" json:"receiver_id"`
	Status string `bson:"status" json:"status"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
}


type ChatRoom struct{
	ID bson.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Participants []bson.ObjectID `bson:"participants" json:"participants"`
	LastMessageAt time.Time      `bson:"last_message_at" json:"last_message_at"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	
}


type Message struct{
	ID bson.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	RoomID bson.ObjectID `bson:"room_id" json:"room_id"`
	SenderID bson.ObjectID `bson:"sender_id" json:"sender_id"`
	Content string `bson:"content" json:"content"`
	Seen *time.Time `bson:"seen_at,omitempty" json:"seen_at,omitempty"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	

}




