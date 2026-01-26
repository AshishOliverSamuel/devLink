package controllers

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/ayushmehta03/devLink-backend/database"
	"github.com/ayushmehta03/devLink-backend/models"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func GetHomeFeed(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		collection := database.OpenCollection("posts", client)

		filter := bson.M{
			"published": true,
		}

		opts := options.Find().
			SetSort(bson.D{{"created_at", -1}}). 
			SetLimit(3)                          

		cursor, err := collection.Find(ctx, filter, opts)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to fetch home feed",
			})
			return
		}

		var posts []models.Post
		if err := cursor.All(ctx, &posts); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to parse posts",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"posts": posts,
		})
	}
}


func CreatePost(client *mongo.Client) gin.HandlerFunc{
	return func(c *gin.Context ){


		userId,exists:=c.Get("user_id")

		if !exists{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized"})
			return 
		}

		var post models.Post

		if err:=c.ShouldBindJSON(&post);err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid input"})
			return 
		}

		post.ID=bson.NewObjectID()
		post.AuthorID,_=bson.ObjectIDFromHex(userId.(string))
		post.Slug=GenerateUniqueSlug(post.Title)
		post.ViewCount=0
		post.CreatedAt=time.Now()
		post.UpdatedAt=time.Now()


		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)

		defer cancel()

		collection:=database.OpenCollection("posts",client)

		_,err:=collection.InsertOne(ctx,post)

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to create post"})
			return 
		}

		c.JSON(http.StatusCreated,gin.H{"message":"Post created successfully",
	})

	}
}


func GetAllPosts(client *mongo.Client) gin.HandlerFunc{
	return func(c *gin.Context){

		ctx,cancel:=context.WithTimeout(context.Background(),time.Second)

		defer cancel();

		collection:=database.OpenCollection("posts",client)


		filter:=bson.M{
			"published":true,
		}

		opts:=options.Find().SetSort(bson.M{"created_at":-1})


		cursor,err:=collection.Find(ctx,filter,opts)

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to fetch posts"})
			return 
		}
		defer cursor.Close(ctx)


		var posts []models.Post

		if err:=cursor.All(ctx,&posts);err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to parse posts"})
			return 
		}

		c.JSON(http.StatusOK,posts)

	}
}


func GetPostBySlug(client *mongo.Client) gin.HandlerFunc{
	return func (c*gin.Context){
		slug:=c.Param("slug")



		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)

		defer cancel()


		collection:=database.OpenCollection("posts",client)

		var post models.Post


		err := collection.FindOneAndUpdate(
			ctx,
			bson.M{"slug": slug, "published": true},
			bson.M{"$inc": bson.M{"view_count": 1}},
		).Decode(&post)


		if err!=nil{
			c.JSON(http.StatusNotFound,gin.H{"error":"Post not found"})
			return 
		}

		c.JSON(http.StatusOK,post)

}
}



func GenerateSlug(title string) string {


    slug := strings.ToLower(title)
    
    reg, _ := regexp.Compile("[^a-z0-9 ]+")
    slug = reg.ReplaceAllString(slug, "")
    
    slug = strings.ReplaceAll(slug, " ", "-")
    
    return strings.Trim(slug, "-")
}

func GenerateUniqueSlug(title string) string {
    baseSlug := GenerateSlug(title) 
    
    b := make([]byte, 2)
    rand.Read(b)
    randomID := fmt.Sprintf("%x", b)
    
    return fmt.Sprintf("%s-%s", baseSlug, randomID)
}


func UpdatePost(client *mongo.Client)gin.HandlerFunc{
	return func(c*gin.Context){

		postId:=c.Param("id")

		userId,exists:=c.Get("user_id")

		if !exists{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized "})
			return 
		}
		postObjId,err:=bson.ObjectIDFromHex(postId)


		if err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid post id"})
			return 
		}


		userObjId,_:=bson.ObjectIDFromHex(userId.(string))

		var updateData struct {
			Title     string   `json:"title"`
			Content   string   `json:"content"`
			ImageURL  string   `json:"image_url"`
			Tags      []string `json:"tags"`
			Published bool     `json:"published"`
		}

		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		collection := database.OpenCollection("posts", client)

		var post models.Post
		err = collection.FindOne(ctx, bson.M{"_id": postObjId}).Decode(&post)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
			return
		}


		if post.AuthorID != userObjId {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not allowed to update this post"})
			return
		}

		// 5️⃣ Prepare update fields
		update := bson.M{
			"$set": bson.M{
				"title":      updateData.Title,
				"content":    updateData.Content,
				"image_url":  updateData.ImageURL,
				"tags":       updateData.Tags,
				"published":  updateData.Published,
				"updated_at": time.Now(),
				"slug":      GenerateUniqueSlug(updateData.Title),
			},
		}

		_, err = collection.UpdateOne(ctx, bson.M{"_id": postObjId}, update)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update post"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Post updated successfully"})



		
	}
}

func DeletePost(client *mongo.Client)gin.HandlerFunc{
	return func(c*gin.Context){
		userId,exits:=c.Get("user_id")

		if !exits{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized"})
			return 
		}


		postId:=c.Param("id")


		postObjId,err:=bson.ObjectIDFromHex(postId)

		if err!=nil{
			c.JSON(http.StatusBadRequest,gin.H{"error":"Invalid post id"})
			return 
		}


		userObjId,_:=bson.ObjectIDFromHex(userId.(string))

		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)

		defer cancel()


		collection:=database.OpenCollection("posts",client)

		var post models.Post

		err=collection.FindOne(ctx,bson.M{"_id":postObjId}).Decode(&post)

		if err!=nil{
			c.JSON(http.StatusNotFound,gin.H{"error":"Post not found"})
			return 
		}

		if post.AuthorID != userObjId {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not allowed to delete this post"})
			return
		}



		_,err=collection.DeleteOne(ctx,bson.M{"_id":postObjId})

		if err!=nil{
		c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to delete post"})

		}

		c.JSON(http.StatusOK,gin.H{"message":"Post deleted successfully"})



	}

}

func GetArchivePosts(client *mongo.Client) gin.HandlerFunc{
	return func(c *gin.Context){

		userId,exists:=c.Get("user_id")

		if !exists{
			c.JSON(http.StatusUnauthorized,gin.H{"error":"Unauthorized"})
			return 
		}

		authorId,_:=bson.ObjectIDFromHex(userId.(string))

		ctx,cancel:=context.WithTimeout(context.Background(),10*time.Second)

		defer cancel();

		filter:=bson.M{
			"author_id":authorId,
			"published":false,
		}

		collection:=database.OpenCollection("posts",client)

		cursor,err:=collection.Find(ctx,filter)

		if err!=nil{
			c.JSON(http.StatusInternalServerError,gin.H{"error":"Failed to fetch archive at this momnent"})
			return 
		}

		defer cursor.Close(ctx)

		var posts []models.Post

		cursor.All(ctx,&posts)

		c.JSON(http.StatusOK,posts)
	}
}