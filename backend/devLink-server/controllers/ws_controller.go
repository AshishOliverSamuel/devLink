package controllers

import (
	"net/http"

	"github.com/gorilla/websocket"
)



var upgarder=websocket.Upgrader{
	CheckOrigin: func(r*http.Request) bool{
		return true
	},
}


