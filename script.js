// Function to create a shader
function createShader(gl, sourceCode, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, sourceCode);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Function to create a WebGL program
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  const vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

// Vertex shader source code
const vertexShaderSource = `
  attribute vec3 coordinates;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  void main(void) {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(coordinates, 1.0);
  }
`;

// Fragment shader source code
const fragmentShaderSource = `
  precision mediump float;
  void main(void) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color
  }
`;

// Function to load local JSON data
function loadLocalJSON(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', file, true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error('Failed to parse JSON'));
        }
      } else {
        reject(new Error('Failed to load file: ' + xhr.statusText));
      }
    };
    xhr.onerror = function () {
      reject(new Error('Network error'));
    };
    xhr.send();
  });
}

// Function to create the projection matrix
function createProjectionMatrix(canvas) {
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100.0);
  return projectionMatrix;
}

// Function to create the model-view matrix with rotation only around the Y-axis
function createModelViewMatrix(rotationY) {
  const modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -6]); // Move back from the camera
  mat4.rotateY(modelViewMatrix, modelViewMatrix, rotationY); // Rotate only around the Y-axis
  return modelViewMatrix;
}

// Main function
async function main() {
  const canvas = document.getElementById('webgl-canvas');
  const gl = canvas.getContext('webgl');

  if (!gl) {
    console.error('WebGL not supported');
    return;
  }

  // Enable depth testing
  gl.enable(gl.DEPTH_TEST);

  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  if (!program) return;

  gl.useProgram(program);

  try {
    const data = await loadLocalJSON('data.json');
    
    const vertices = [];
    for (const point of data) {
      vertices.push(point.x, point.y, point.z);
    }

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const coord = gl.getAttribLocation(program, 'coordinates');
    gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(coord);

    const modelViewMatrixLocation = gl.getUniformLocation(program, 'modelViewMatrix');
    const projectionMatrixLocation = gl.getUniformLocation(program, 'projectionMatrix');
    
    // Create projection matrix and set it as a uniform
    const projectionMatrix = createProjectionMatrix(canvas);
    gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);

    let rotationY = 0;

    function animate() {
      rotationY += 0.01;

      const modelViewMatrix = createModelViewMatrix(rotationY);
      gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);

      gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.drawArrays(gl.POINTS, 0, vertices.length / 3);

      requestAnimationFrame(animate);
    }

    animate();
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main();