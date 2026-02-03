package controllers

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)







func GetUserProfile(client *mongo.Client )gin.HandlerFunc{
	return func(c* gin.Context){
		


		userId:=c.Param("userId")

		userObjId,err:=bson.ObjectIDFromHex(userId)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
			return
		}

		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)

		defer cancel()


		userCollection:=database.OpenCollection("users",client)
		postCollection:=database.OpenCollection("posts",client)

		var user models.User


		err=userCollection.FindOne(ctx,bson.M{"_id":userObjId}).Decode(&user)

		if err!=nil{
		c.JSON(http.StatusNotFound,gin.H{"error":"User not found"})
		return 
		}

		filter:=bson.M{
			"author_id":user.Id,
			"published":true,
		}

		cursor,_:=postCollection.Find(ctx,filter)

		 posts:=[]models.Post{}

		cursor.All(ctx,&posts)

c.JSON(http.StatusOK, gin.H{
			"user": gin.H{
				"name": user.UserName,
				"bio":  user.Bio,
				"profile_image":user.ProfileImage,
				"last_seen":user.LastSeen,
			},
			"posts": posts,
		})	}
}



func SearchUsers(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		query := strings.TrimSpace(c.Query("q"))
		if len(query) < 2 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Query missing",
			})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		userCollection := database.OpenCollection("users", client)

		filter := bson.M{
			"name": bson.M{
				"$regex":   query,
				"$options": "i",
			},
		}

		cursor, err := userCollection.Find(ctx, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Search failed",
			})
			return
		}
		defer cursor.Close(ctx)

		type UserResponse struct {
			ID           string `json:"id"`
			Username     string `json:"username"`
			Bio          string `json:"bio,omitempty"`
			ProfileImage string `json:"profile_image,omitempty"`
		}

		var users []UserResponse

		for cursor.Next(ctx) {
			var user models.User
			if err := cursor.Decode(&user); err != nil {
				continue
			}

			users = append(users, UserResponse{
				ID:           user.Id.Hex(),     
				Username:     user.UserName,
				Bio:          user.Bio,
				ProfileImage: user.ProfileImage,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"users": users,
		})
	}
}






func GetUserProfileStats(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.Param("userId")

		userObjId, err := bson.ObjectIDFromHex(userId)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		postCollection := database.OpenCollection("posts", client)

		pipeline := []bson.M{
			{
				"$match": bson.M{
					"author_id": userObjId,
					"published": true,
				},
			},
			{
				"$group": bson.M{
					"_id":        nil,
					"totalPosts": bson.M{"$sum": 1},
					"totalViews": bson.M{"$sum": "$view_count"},
				},
			},
		}

		cursor, _ := postCollection.Aggregate(ctx, pipeline)

		var result []bson.M
		cursor.All(ctx, &result)

		if len(result) == 0 {
			c.JSON(http.StatusOK, gin.H{
				"total_posts": 0,
				"total_views": 0,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"total_posts": result[0]["totalPosts"],
			"total_views": result[0]["totalViews"],
		})
	}
}





func GetSuggestedUsers(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		currentUser := c.GetString("userId")

		limitStr := c.DefaultQuery("limit", "5")
		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			limit = 5
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		userCollection := database.OpenCollection("users", client)


		filter := bson.M{
			"user_id": bson.M{"$ne": currentUser},
		}

		if oid, err := bson.ObjectIDFromHex(currentUser); err == nil {
			filter["_id"] = bson.M{"$ne": oid}
		}

		opts := options.Find().
			SetLimit(int64(limit)).
			SetSort(bson.M{"created_at": -1})

		cursor, err := userCollection.Find(ctx, filter, opts)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to fetch suggested users",
			})
			return
		}
		defer cursor.Close(ctx)


		type SuggestedUser struct {
			ID           string `json:"id"`              
			UserId       string `json:"user_id"`         
			UserName     string `json:"username"`
			ProfileImage string `json:"profile_image,omitempty"`
		}

		var users []SuggestedUser

		for cursor.Next(ctx) {
			var u models.User

			if err := cursor.Decode(&u); err != nil {
				continue
			}

			users = append(users, SuggestedUser{
				ID:           u.Id.Hex(),   
				UserId:       u.UserId,    
				UserName:     u.UserName,
				ProfileImage: u.ProfileImage,
			})
		}

		if err := cursor.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Error reading suggested users",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"users": users,
		})
	}
}
