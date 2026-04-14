FROM golang:1.24 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod tidy

COPY . .
RUN go build -o main .

FROM alpine:latest

WORKDIR /app

RUN adduser -D appuser

COPY --from=builder /app/main .

USER appuser

EXPOSE 8080

CMD ["./main"]
