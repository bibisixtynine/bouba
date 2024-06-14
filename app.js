// 🚀 Starting Point: WebSocket Whiteboard Server

// 📦 Import required modules
const sharp = require("sharp");

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
// const { createCanvas } = require("canvas");

// 🌐 Create an Express application
const app = express();

// 📁 Serve static files from the "public" folder
app.use(express.static("public"));

// 🌐 Create an HTTP server instance using Express app
const server = http.createServer(app);

// 🌐 Create a WebSocket server by passing the HTTP server instance
const wss = new WebSocket.Server({ server });

// 🖱️ Store mouse positions
const mousePositions = [];

// 📁 Create a "drawings" folder if it doesn't exist
const drawingsFolder = path.join(__dirname, "drawings");
if (!fs.existsSync(drawingsFolder)) {
  fs.mkdirSync(drawingsFolder);
}

// 🌈 Rainbow color generator
function createRainbowColorGenerator() {
  let hue = 0;

  return function () {
    // Convert HSL color to RGB for web display
    const rgbColor = hslToRgb(hue / 360, 1, 0.5);

    // Convert RGB to hexadecimal format
    const hexColor = rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2]);

    // Increment the hue for the next call
    hue = (hue + 1) % 360;

    return `#${hexColor}`;
  };
}

// 🎨 Draw a rainbow circle on the server canvas
function drawRainbowCircleOnCanvas(canvas, x, y, radius, getColor) {
  const context = canvas.getContext("2d");
  const color = getColor();

  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI);
  context.fillStyle = color;
  context.fill();
}

// 📦 Calculate the bounding box of mouse positions
function calculateBoundingBox(positions) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { x, y } of positions) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return { minX, minY, maxX, maxY };
}

// 🌈 Function to convert HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const hueToRgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// 🌈 Function to convert RGB to hexadecimal format
function rgbToHex(r, g, b) {
  return ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// 🖼️ Serve all images in the "drawings" folder as a webpage containing a grid
//

function serveDrawingsPage(req, res) {
  const imageFiles = fs.readdirSync(drawingsFolder)
    .map((filename) => {
      const imagePath = path.join(drawingsFolder, filename);
      const stats = fs.statSync(imagePath);
      return {
        filename,
        modifiedTime: stats.mtime.getTime(), // Get modification time
      };
    })
    .sort((a, b) => b.modifiedTime - a.modifiedTime) // Sort by modification time in reverse order
    .map((file) => file.filename);

  const imagesPerPage = 10;
  const currentPage = req.query.page ? parseInt(req.query.page) : 1;

  // Calculate the range of images to display based on the current page
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const imagesToDisplay = imageFiles.slice(startIndex, endIndex);

  // Calculate the total number of pages
  const totalPages = Math.ceil(imageFiles.length / imagesPerPage);

  // Generate navigation links for previous and next pages
  const prevPage = currentPage > 1 ? currentPage - 1 : 1;
  const nextPage = currentPage < totalPages ? currentPage + 1 : totalPages;

  // Generate page number links
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const imagesHTML = imagesToDisplay.map((filename) => {
    const imageUrl = `/drawings/${filename}`;
    const imageDate = extractImageDateTime(filename); // Extract date and time

    return `
      <div style="position: relative; display: inline-block;">
        <a href="${imageUrl}" download="${filename}" style="position: absolute; top: 5px; left: 5px; background-color: rgba(0, 0, 0, 0.8); color: white; font-size: 12px; padding: 2px 5px; border-radius: 5px; text-decoration: none;">
          <i class="fa fa-download"></i>
        </a>
        <img src="${imageUrl}" alt="${filename}" style="border: 2px solid white; border-radius: 10px; max-width: 300px; max-height: 300px; margin: 10px;" />
        <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); background-color: rgba(0, 0, 0, 0.8); color: white; font-size: 12px; padding: 2px 5px; border-radius: 5px;">
          ${imageDate}
        </div>
        <button style="position: absolute; top: 5px; right: 5px; background-color: red; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;" onclick="deleteImage('${filename}')">&#10006;</button>
      </div>
    `;
  }).join("");

  const pageNumbersHTML = pageNumbers.map((pageNumber) => {
    // Highlight the current page number
    const isCurrentPage = pageNumber === currentPage ? 'current-page' : '';
    return `
      <a href="?page=${pageNumber}" class="page-number ${isCurrentPage}">${pageNumber}</a>
    `;
  }).join(" ");

  const titleWithEmoji = 'Drawings 🎉'; // Add happy emojis to the title

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${titleWithEmoji}</title>
      <!-- Google Fonts-->
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Reenie+Beanie&display=swap');
      </style>
      <style>
        body {
          background-color: #111111;
          text-align: center;
        }
        img {
          max-width: 300px;
          max-height: 300px;
          margin: 10px;
        }
        .pagination {
          margin-top: 20px;
          margin-bottom: 40px;
        }
        .pagination a {
          margin: 0 5px;
          text-decoration: none;
          color: #fff;
          font-size: 18px;
        }
        .pagination a.current-page {
          font-weight: bold;
        }
        .page-number {
          margin: 0 5px; /* Add spacing between page numbers */
          text-decoration: none;
          color: #fff;
          font-size: 18px;
        }
        .page-number.current-page {
          font-weight: bold;
          font-size: 24px; /* Adjust the font size as needed */
          color: red; /* Change the color to red */
        }
        .subtitle {
          font-family: 'Reenie Beanie';
          font-size: 30px;
          color: red;
        }
        
        /* Apply the font to the title */
        .title {
          font-family: 'Luckiest Guy', cursive; /* Use the Google Font */
          background: linear-gradient(45deg, #f06, #f90, #fc0, #ff0, #0f6, #0f9, #0fc, #0ff, #60f, #90f, #c0f, #f0f);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-top: 20px; /* Add space between title and page numbers */
          font-size: 56px; /* Increase title font size */
        }
      </style>
      <!-- Add Font Awesome for the download icon -->
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
      <script>
        function deleteImage(filename) {
          if (confirm("Are you sure you want to delete this image?")) {
            fetch("/delete-image/" + filename, {
              method: "DELETE",
            })
              .then(() => {
                location.reload();
              })
              .catch((error) => {
                console.error("Error deleting image: " + error);
              });
          }
        }
      </script>
    </head>
    <body>
      <h1 class="title">${titleWithEmoji}</h1>
      <h3 class="subtitle">Crafted with 💥😄🎉</h3>
      <div class="pagination">
        <a href="?page=${prevPage}">&lt;&lt;</a>
        ${pageNumbersHTML}
        <a href="?page=${nextPage}">&gt;&gt;</a>
      </div>
      <div>${imagesHTML}</div>
    </body>
    </html>
  `;

  res.send(html);
}



// Function to extract and format the date and time from the timestamp in the image filename
function extractImageDateTime(filename) {
  const timestampMatch = filename.match(/(\d+)\.png/); // Match the timestamp part of the filename
  if (timestampMatch) {
    const timestamp = parseInt(timestampMatch[1]);

    // Add 2 hours (7200000 milliseconds) to the timestamp
    const adjustedTimestamp = timestamp + 7200000;

    const creationDate = new Date(adjustedTimestamp);

    // Extract date components in DD/MM/YY format
    const day = String(creationDate.getDate()).padStart(2, '0');
    const month = String(creationDate.getMonth() + 1).padStart(2, '0');
    const year = String(creationDate.getFullYear()).slice(-2);

    // Extract time components in HH:MM format (24-hour)
    const hours = String(creationDate.getHours()).padStart(2, '0');
    const minutes = String(creationDate.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year}\n${hours}:${minutes}`;
  }
  return "Date and time not available"; // Handle cases where the timestamp format is not found in the filename
}





// Add a new route to handle image deletion
app.delete("/delete-image/:filename", (req, res) => {
  const { filename } = req.params;
  const drawingPath = path.join(drawingsFolder, filename);

  if (fs.existsSync(drawingPath)) {
    fs.unlinkSync(drawingPath);
    res.status(200).send("Image deleted successfully");
  } else {
    res.status(404).send("Image not found");
  }
});


// 📄 Serve individual drawing images (png on transparent background)

function png_serveDrawingImage(req, res) {
  const { filename } = req.params;
  const drawingPath = path.join(drawingsFolder, filename);

  if (fs.existsSync(drawingPath)) {
    const stream = fs.createReadStream(drawingPath);
    stream.pipe(res);
  } else {
    res.status(404).send("Drawing not found");
  }
}



// 📄 Serve individual drawing  (jpeg on black background)

function serveDrawingImage(req, res) {
  const { filename } = req.params;
  const drawingPath = path.join(drawingsFolder, filename);

  if (fs.existsSync(drawingPath)) {
    // Use sharp to resize and optimize the image
    const image = sharp(drawingPath).jpeg({ quality: 20 });

    // Pipe the optimized image to the response
    image.pipe(res);
  } else {
    res.status(404).send("Drawing not found");
  }
}

//
// 🖼️ Serve all images in the "drawings" folder as a webpage containing a grid
//
//////////////////////////////////////////////////////////////////////////////////////////






//////////////////////////////////////////////////////////////////////////////////////////
//
// 🌐 WebSocket server logic
//

// Initialize WebSocket connection
function handleWebSocketConnection(ws) {
  // Send recorded circles to the new client when they connect
  sendRecordedCirclesToClient(ws);

  // Handle WebSocket errors
  ws.on('error', handleError);

  // Handle WebSocket messages
  ws.on("message", (message) => {
    handleMessage(ws, message); // Pass ws to handleMessage
  });
}

// Send recorded circles to the new client
function sendRecordedCirclesToClient(ws) {
  const recordedCircles = mousePositions
    .map(({ x, y }) => `${x},${y}`)
    .join(";");
  
  if (recordedCircles) {
    console.log("💥 New client connected, sending recordedCircles");
    ws.send("clearCanvas");
    ws.send(`${recordedCircles}`);
  }
}

// Handle WebSocket errors
function handleError(error) {
  console.error("WebSocket error:", error);
}

// Handle WebSocket messages
function handleMessage(ws, message) {
  const stringMessage = message.toString();

  if (stringMessage === "recordClick") {
    // Record a click event
    recordClickEvent();
  } else if (stringMessage.startsWith("mousePosition")) {
    // Handle mouse position updates
    const [, mouseX, mouseY] = stringMessage.split(",");
    handleMousePositionUpdate(ws, parseFloat(mouseX), parseFloat(mouseY)); // Pass ws, mouseX, and mouseY
  } else if (stringMessage === "clearCanvas") {
    // Clear the canvas and save the drawing
    clearCanvasAndSaveDrawing();
  } else if (stringMessage === "getRecordedCircles") {
    // Send recorded circles to the requesting client
    sendRecordedCirclesToRequestingClient(ws); // Pass ws to sendRecordedCirclesToRequestingClient
  }
}

// Record a click event
function recordClickEvent() {
  const currentDate = new Date().toLocaleString();
  fs.appendFile("clicks.txt", `${currentDate}\n`, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.log("Click recorded.");
    }
  });
}

// Handle mouse position updates
function handleMousePositionUpdate(ws, mouseX, mouseY) {
  const timestamp = Date.now();
  mousePositions.push({ timestamp, x: mouseX, y: mouseY });
  
  // Save mousePositions to a file
  //saveMousePositions();

  // Send mouse position to all clients except the emitter client
  sendMousePositionToClientsExceptEmitter(ws, mouseX, mouseY); // Pass ws, mouseX, and mouseY
}

// Clear the canvas and save the drawing
function clearCanvasAndSaveDrawing() {

  const timestamp = Date.now();
  const imageFileName = path.join(drawingsFolder, `${timestamp}.png`);

  // Calculate the bounding box of mouse positions
  const boundingBox = calculateBoundingBox(mousePositions);

  // Create a larger canvas based on the bounding box
  const canvas = createCanvas(boundingBox.maxX - boundingBox.minX + 20, boundingBox.maxY - boundingBox.minY + 20);

  // Translate mouse positions to fit the new canvas
  const context = canvas.getContext("2d");
  for (const { x, y } of mousePositions) {
    drawRainbowCircleOnCanvas(canvas, x - boundingBox.minX + 10, y - boundingBox.minY + 10, 10, getColor);
  }

  const stream = canvas.createPNGStream();
  const out = fs.createWriteStream(imageFileName);
  stream.pipe(out);

  mousePositions.length = 0; // Clear the array
  
  // Save mousePositions to a file
  saveMousePositions();

  // Broadcast the clearCanvas message to all clients
  broadcastClearCanvasMessage();
}

// Send mouse position to all clients except the emitter client
function sendMousePositionToClientsExceptEmitter(ws, mouseX, mouseY) {
  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(`mousePosition,${mouseX},${mouseY}`);
    }
  });
}

// Broadcast the clearCanvas message to all clients
function broadcastClearCanvasMessage() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send("clearCanvas");
    }
  });
}

// Send recorded circles to the requesting client
function sendRecordedCirclesToRequestingClient(ws) {
  const recordedCircles = mousePositions
    .map(({ x, y }) => `${x},${y}`)
    .join(";");
  console.log("💥 getRecordedCircles received -> send recordedCircles");
  ws.send(`recordedCircles|${recordedCircles}`);
}



function saveMousePositions() {
  const data = JSON.stringify(mousePositions);
  fs.writeFileSync('mousePositions.json', data);
}

//
// 🌐 WebSocket server logic
//
//////////////////////////////////////////////////////////////////////////////////////////






// 🚀 Start the server on the specified port (default: 3000)
function startServer() {
  const port = process.env.PORT || 3000;

  // Check if the mousePositions file exists and load its content if it does
  if (fs.existsSync('mousePositions.json')) {
    const data = fs.readFileSync('mousePositions.json', 'utf8');
    mousePositions.push(...JSON.parse(data));
    console.log('Mouse positions loaded from file.');
  }

  server.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
  });
}


// Initialize the server
const getColor = createRainbowColorGenerator();
wss.on("connection", handleWebSocketConnection);
app.get("/drawings", serveDrawingsPage);
app.get("/drawings/:filename", serveDrawingImage);
startServer();