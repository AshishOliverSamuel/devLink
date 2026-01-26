package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)





type Post struct {
	ID bson.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`

	Title   string `bson:"title" json:"title" validate:"required,min=5,max=150"`
	Slug    string `bson:"slug,omitempty" json:"slug,omitempty"`
	Content string `bson:"content" json:"content" validate:"required"`

	AuthorID bson.ObjectID `bson:"author_id" json:"author_id"`


	Tags []string `bson:"tags,omitempty" json:"tags,omitempty"`


	ImageURL string `bson:"image_url,omitempty" json:"image_url,omitempty"`

	Published bool  `bson:"published" json:"published"`
	ViewCount int64 `bson:"view_count" json:"view_count"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`


}
