package controllers

import (
	"context"
	"net/http"
	"time"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)


func GetUserProfile(client *mongo.Client )gin.HandlerFunc{
	return func(c* gin.Context){


		userId:=c.Param("id")

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
			},
			"posts": posts,
		})	}
}

func SearchUsers(client *mongo.Client)gin.HandlerFunc{
	return func(c *gin.Context){

		query:=c.Query("q")

		if query==""{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Query missing"})
			return 
		}

		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)
		defer cancel()


		userCollection:=database.OpenCollection("users",client)

		filter:=bson.M{
			"name":bson.M{
				"$regex":query,
				"$options":"i",
			},
		}

		cursor,err:=userCollection.Find(ctx,filter)

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Search failed"})
			return 
		}

		defer cursor.Close(ctx)


		var users []gin.H

		for cursor.Next(ctx){
			var user models.User
			cursor.Decode(&user)
		

		users=append(users, gin.H{
			"name":user.UserName,
			"bio":user.Bio,
			"profile_pic":user.ProfileImage,
		})
	}

	c.JSON(http.StatusOK,users)
	}
}


func SearchPost(client *mongo.Client) gin.HandlerFunc{
	return func (c *gin.Context){

		query:=c.Query("t");

		if query==""{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Search query missing"})
			return 
		}

		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second);
		defer cancel()


		postCollection:=database.OpenCollection("posts",client)
		

		filters:=bson.M{
			"tags":bson.M{
				"$regex":query,
				"$options":"i",
			},
			"published":true,

		
		}

		cursor,err:=postCollection.Find(ctx,filters)


		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Search failed"})
			return 
		}
				defer cursor.Close(ctx)


			var posts []gin.H

			for cursor.Next(ctx){
				var post models.Post
				cursor.Decode(&post)

				posts=append(posts, gin.H{
				"title":post.Title,
				"slug":post.Slug,
				"created_at":post.CreatedAt,
				"views":post.ViewCount,
				"tags":post.Tags,
			})

			}
		
			c.JSON(http.StatusOK,posts)
			

	}
}


func GetUserProfileStats(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userId := c.Param("id")

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
