package database

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func Connect() *mongo.Client {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI not set")
	}

	client, err := mongo.Connect(
		options.Client().
			ApplyURI(mongoURI).
			SetConnectTimeout(10 * time.Second),
	)
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Mongo ping failed:", err)
	}

	log.Println("Mongo connected")
	return client
}

func OpenCollection(name string, client *mongo.Client) *mongo.Collection {
	dbName := os.Getenv("DATABASE_NAME")
	if dbName == "" {
		log.Fatal("DATABASE_NAME not set")
	}

	return client.Database(dbName).Collection(name)
}
