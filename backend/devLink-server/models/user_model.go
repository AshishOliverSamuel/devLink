package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type User struct {
	Id     bson.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	UserId string        `bson:"user_id" json:"user_id"`

	UserName string `bson:"name" json:"name" validate:"required,min=5,max=22"`
	Email    string `bson:"email" json:"email" validate:"required,email"`
	Password string `bson:"password" json:"password" validate:"required,min=6"`

	Bio  string `bson:"bio,omitempty" json:"bio"`
	Role string `bson:"role" json:"role"`
    ProfileImage  string `bson:"profile_image" json:"profile_image"`


	IsVerified bool      `bson:"is_verified" json:"is_verified"`
	OTPHash    string    `bson:"otp_hash,omitempty" json:"-"`
	OTPExpiry  time.Time `bson:"otp_expiry,omitempty" json:"-"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
	LastSeen *time.Time `bson:"last_seen,omitempty" json:"last_seen,omitempty"`

}

type UserLogin struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}
