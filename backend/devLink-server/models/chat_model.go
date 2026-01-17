package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)


type ChatRequest struct{
	ID bson.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	SenderID bson.ObjectID `bson:"sender_id" json:"sender_id"`
	ReceiverID bson.ObjectID `bson:"receiver_id" json:"receiver_id"`
	Status string `bson:"status" json:"status"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
}


type ChatRoom struct{
	ID bson.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	Participants []bson.ObjectID `bson:"participants" json:"participants"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	
}






