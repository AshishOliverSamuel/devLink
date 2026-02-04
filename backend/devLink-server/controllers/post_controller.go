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
	"github.com/ayushmehta03/devLink-backend/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type PostAuthor struct {
	ID           bson.ObjectID `json:"id"`
	Username     string        `json:"username"`
	ProfileImage string        `json:"profile_image"`
}

type HomePostResponse struct {
	models.Post
	Author PostAuthor `json:"author"`
}

type PostResponse struct {
	models.Post
	Author PostAuthor `json:"author"`
}


func GetHomeFeed(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		postCol := database.OpenCollection("posts", client)
		userCol := database.OpenCollection("users", client)

		cursor, err := postCol.Find(
			ctx,
			bson.M{"published": true},
			options.Find().
				SetSort(bson.D{{Key: "created_at", Value: -1}}).
				SetLimit(3),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch home feed"})
			return
		}

		var posts []models.Post
		if err := cursor.All(ctx, &posts); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse posts"})
			return
		}

		var response []HomePostResponse

		for _, post := range posts {
			var user models.User
			if err := userCol.FindOne(ctx, bson.M{"_id": post.AuthorID}).Decode(&user); err != nil {
				continue
			}

			response = append(response, HomePostResponse{
				Post: post,
				Author: PostAuthor{
					ID:           user.Id,
					Username:     user.UserName,
					ProfileImage: user.ProfileImage,
				},
			})
		}

		c.JSON(http.StatusOK, gin.H{"posts": response})
	}
}

func GetTrendingPosts(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		postCol := database.OpenCollection("posts", client)
		userCol := database.OpenCollection("users", client)

		cursor, err := postCol.Find(
			ctx,
			bson.M{"published": true},
			options.Find().
				SetSort(bson.D{{Key: "view_count", Value: -1}}).
				SetLimit(10),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to fetch trending posts",
			})
			return
		}

		var posts []models.Post
		if err := cursor.All(ctx, &posts); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to parse trending posts",
			})
			return
		}

		var response []HomePostResponse

		for _, post := range posts {
			var user models.User
			if err := userCol.FindOne(ctx, bson.M{"_id": post.AuthorID}).Decode(&user); err != nil {
				continue
			}

			response = append(response, HomePostResponse{
				Post: post,
				Author: PostAuthor{
					ID:           user.Id,
					Username:     user.UserName,
					ProfileImage: user.ProfileImage,
				},
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"posts": response,
		})
	}
}



func CreatePost(client *mongo.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        userId, exists := c.Get("user_id")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
            return
        }

        var post models.Post
        if err := c.ShouldBindJSON(&post); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
            return
        }

        ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()

        authorObjId, err := bson.ObjectIDFromHex(userId.(string))
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
            return
        }

        var user models.User
        userCol := database.OpenCollection("users", client)
        if err := userCol.FindOne(ctx, bson.M{"_id": authorObjId}).Decode(&user); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
            return
        }

        post.ID = bson.NewObjectID()
        post.AuthorID = authorObjId
        post.Slug = GenerateUniqueSlug(post.Title)
        post.ViewCount = 0
        post.CreatedAt = time.Now()
        post.UpdatedAt = time.Now()

        if _, err := database.OpenCollection("posts", client).InsertOne(ctx, post); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create post"})
            return
        }

        c.JSON(http.StatusCreated, PostResponse{
            Post: post,
            Author: PostAuthor{
                ID:           user.Id,
                Username:     user.UserName,
                ProfileImage: user.ProfileImage,
            },
        })
    }
}


func GetAllPosts(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		postCol := database.OpenCollection("posts", client)
		userCol := database.OpenCollection("users", client)

		cursor, err := postCol.Find(
			ctx,
			bson.M{"published": true},
			options.Find().SetSort(bson.M{"created_at": -1}),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch posts"})
			return
		}

		var posts []models.Post
		if err := cursor.All(ctx, &posts); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse posts"})
			return
		}

		var response []PostResponse

		for _, post := range posts {
			var user models.User
			if err := userCol.FindOne(ctx, bson.M{"_id": post.AuthorID}).Decode(&user); err != nil {
				continue
			}

			response = append(response, PostResponse{
				Post: post,
				Author: PostAuthor{
					ID:           user.Id,
					Username:     user.UserName,
					ProfileImage: user.ProfileImage,
				},
			})
		}

		c.JSON(http.StatusOK, response)
	}
}


func GetPostBySlug(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		postCol := database.OpenCollection("posts", client)
		userCol := database.OpenCollection("users", client)

		var post models.Post
		err := postCol.FindOneAndUpdate(
			ctx,
			bson.M{"slug": slug, "published": true},
			bson.M{"$inc": bson.M{"view_count": 1}},
		).Decode(&post)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
			return
		}

		var user models.User
		if err := userCol.FindOne(ctx, bson.M{"_id": post.AuthorID}).Decode(&user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Author not found"})
			return
		}

		c.JSON(http.StatusOK, PostResponse{
			Post: post,
			Author: PostAuthor{
				ID:           user.Id,
				Username:     user.UserName,
				ProfileImage: user.ProfileImage,
			},
		})
	}
}


func UpdatePost(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		postId := c.Param("id")
		userId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		postObjId, err := bson.ObjectIDFromHex(postId)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid post id"})
			return
		}

		userObjId, _ := bson.ObjectIDFromHex(userId.(string))
		collection := database.OpenCollection("posts", client)

		var post models.Post
		if err := collection.FindOne(
			context.Background(),
			bson.M{"_id": postObjId},
		).Decode(&post); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
			return
		}

		if post.AuthorID != userObjId {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
			return
		}

		var data struct {
			Title     *string  `json:"title"`
			Content   *string  `json:"content"`
			ImageURL  *string  `json:"image_url"`
			Tags      []string `json:"tags"`
			Published *bool    `json:"published"`
		}

		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		set := bson.M{}

		if data.Title != nil {
			set["title"] = *data.Title
			set["slug"] = GenerateUniqueSlug(*data.Title)
		}
		if data.Content != nil {
			set["content"] = *data.Content
		}
		if data.ImageURL != nil {
			set["image_url"] = *data.ImageURL
		}
		if data.Tags != nil {
			set["tags"] = data.Tags
		}
		if data.Published != nil {
			set["published"] = *data.Published
		}

		if len(set) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nothing to update"})
			return
		}

		set["updated_at"] = time.Now()

		_, err = collection.UpdateOne(
			context.Background(),
			bson.M{"_id": postObjId},
			bson.M{"$set": set},
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Post updated"})
	}
}


func DeletePost(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		postId := c.Param("id")
		userId, _ := c.Get("user_id")

		postObjId, _ := bson.ObjectIDFromHex(postId)
		userObjId, _ := bson.ObjectIDFromHex(userId.(string))

		col := database.OpenCollection("posts", client)

		var post models.Post
		col.FindOne(context.Background(), bson.M{"_id": postObjId}).Decode(&post)

		if post.AuthorID != userObjId {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
			return
		}

		col.DeleteOne(context.Background(), bson.M{"_id": postObjId})
		c.JSON(http.StatusOK, gin.H{"message": "Post deleted"})
	}
}


func GetArchivePosts(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userId, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		authorId, _ := bson.ObjectIDFromHex(userId.(string))
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		cursor, err := database.OpenCollection("posts", client).Find(
			ctx,
			bson.M{"author_id": authorId, "published": false},
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch archive"})
			return
		}

		var posts []models.Post
		cursor.All(ctx, &posts)
		c.JSON(http.StatusOK, posts)
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
	base := GenerateSlug(title)
	b := make([]byte, 2)
	rand.Read(b)
	return fmt.Sprintf("%s-%x", base, b)
}

func GetMyPosts(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		tokenStr, err := c.Cookie("access_token")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		claims, err := utils.VerifyToken(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		userObjId, err := bson.ObjectIDFromHex(claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		postCollection := database.OpenCollection("posts", client)

		filter := bson.M{
			"author_id": userObjId,
			"published": true,
		}

		opts := options.Find().SetSort(bson.M{
			"created_at": -1,
		})

		cursor, err := postCollection.Find(ctx, filter, opts)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch posts"})
			return
		}

		defer cursor.Close(ctx)

		posts := []models.Post{}
		if err := cursor.All(ctx, &posts); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse posts"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"posts": posts,
		})
	}
}


func SearchPost(client *mongo.Client) gin.HandlerFunc {
	return func(c *gin.Context) {

		query := strings.TrimSpace(c.Query("t"))
		if len(query) < 2 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Search query missing",
			})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		postCol := database.OpenCollection("posts", client)
		userCol := database.OpenCollection("users", client)

		filter := bson.M{
			"tags": bson.M{
				"$regex":   query,
				"$options": "i",
			},
			"published": true,
		}

		cursor, err := postCol.Find(ctx, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Search failed",
			})
			return
		}
		defer cursor.Close(ctx)

		var posts []models.Post
		if err := cursor.All(ctx, &posts); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to parse posts",
			})
			return
		}

		var response []PostResponse

		for _, post := range posts {
			var user models.User
			if err := userCol.FindOne(
				ctx,
				bson.M{"_id": post.AuthorID},
			).Decode(&user); err != nil {
				continue
			}

			response = append(response, PostResponse{
				Post: post,
				Author: PostAuthor{
					ID:           user.Id,
					Username:     user.UserName,
					ProfileImage: user.ProfileImage,
				},
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"posts": response,
		})
	}
}
