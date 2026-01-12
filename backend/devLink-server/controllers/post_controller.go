package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)


func CheckMiddleWare(client *mongo.Client)gin.HandlerFunc{
	return func(c*gin.Context){
		c.JSON(http.StatusOK,gin.H{"message":"verified succesfully"})
	}
}
