# Files Manager

A simple file management API built with Node.js, Express, MongoDB, and Redis.

## Description

This project is a summary of back-end trimester covering authentication, NodeJS, MongoDB, Redis, pagination and background processing. The objective is to build a simple platform to upload and view files.

## Features

- User authentication via token
- List all files
- Upload a new file
- Change permission of a file
- View a file
- Generate thumbnails for images
- Background job processing for emails and image thumbnails

## Technologies

- Node.js
- Express.js
- MongoDB
- Redis
- Bull (for job queues)
- ES6

## Requirements

- Ubuntu 18.04 LTS
- Node.js (version 12.x.x)
- MongoDB
- Redis

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/alx-files_manager.git
cd alx-files_manager

