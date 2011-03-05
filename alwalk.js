$(document).ready (function () {

// mostly reused code from transparency sample.

var rotateX;
var rotateY;

var theScene = SceneJS.scene({ canvasId: 'theCanvas', loggingElementId: "theLoggingDiv" },

    SceneJS.lookAt({
      eye : { x: 0, y: 2, z: -22},
      look : { x : 0.0, y : -1.0, z : 0 },
      up : { x: 0.0, y: 1.0, z: 0.0 }
    },
        SceneJS.camera({
          optics: {
            type: "perspective",
            fovy : 25.0,
            aspect : 1.47,
            near : 0.10,
            far : 300.0
          }
        },

            SceneJS.light({
              mode:         "dir",
              color:          { r: 1.0, g: 1.0, b: 1.0 },
              diffuse:        true,
              specular:         true,
              dir:          { x: 1.0, y: 1.0, z: -1.0 }
            }),

            SceneJS.light({
              mode:         "dir",
              color:          {r: 1.0, g: 1.0, b: 1.0},
              diffuse:        true,
              specular:         true,
              dir:          { x: 0.0, y: 1.0, z: -1.0 }
            }),

            SceneJS.light({
              mode:         "dir",
              color:          {r: 1.0, g: 1.0, b: 1.0},
              diffuse:        true,
              specular:         true,
              dir:          { x: -1.0, y: 0.0, z: -1.0 }
            }),

            rotateX = SceneJS.rotate({ angle: 0.0, x : 1.0 },
                rotateY = SceneJS.rotate({ angle: 0.0, y : 1.0 },

                    SceneJS.node({},
                        SceneJS.material({
                            id: "container",
                            nodes: [],
                            baseColor:    { r: 0.3, g: 0.3, b: 0.9 },
                            specularColor:  { r: 0.9, g: 0.9, b: 0.9 },
                            specular:     0.9,
                            shine:      6.0,
                            opacity: 1.0
                            })
                    )
                )
            )
        )
    )
);

var spheres = [];

var createScene = function (xPos, yPos, zPos) {

    var n = SceneJS.withNode ("container")._targetNode;
    n._children [n._children.length] =
        SceneJS.node({ sid: "sphere" + spheres.length },
            SceneJS.translate({x: xPos, y: yPos, z: zPos},
                SceneJS.boundingBox({
                  xmin: -1.0,
                  ymin: -1.0,
                  zmin: -1.0,
                  xmax: 1.0,
                  ymax: 1.0,
                  zmax: 1.0
                },
                    SceneJS.sphere())
                )
            //)
        );
};



/*----------------------------------------------------------------------
 * Scene rendering loop and mouse handler stuff follows
 *---------------------------------------------------------------------*/

var yaw = -30;
var pitch = -30;
var lastX;
var lastY;
var dragging = false;


var canvas = document.getElementById ("theCanvas");

spheres [spheres.length] = createScene (1,1,1);
spheres [spheres.length] = createScene (-1,1,1);
spheres [spheres.length] = createScene (1,1,-1);


function mouseDown(event) {
  lastX = event.clientX;
  lastY = event.clientY;
  dragging = true;
}

function mouseUp() {
  dragging = false;
}

function mouseMove(event) {
  if (dragging) {
    yaw += (event.clientX - lastX) * 0.5;
    pitch += (event.clientY - lastY) * -0.5;
    lastX = event.clientX;
    lastY = event.clientY;
  }
}

canvas.addEventListener('mousedown', mouseDown, true);
canvas.addEventListener('mousemove', mouseMove, true);
canvas.addEventListener('mouseup', mouseUp, true);

window.render = function() {
  rotateX.setAngle(pitch);
  rotateY.setAngle(yaw);
  theScene.render();
};

SceneJS.bind("error", function() {
  window.clearInterval(pInterval);
});

SceneJS.bind("reset", function() {
  window.clearInterval(pInterval);
});

var pInterval = setInterval("window.render()", 100);


});


        function DocumentLoaded() {
            var al = WebAL.getContext();
            //var al = WebAL.getContext({
            //    supportDynamicAudio: false,
            //    supportStereoMixing: false
            //});

            // Use the browser to load the audio
            var audioRef = [
                { type: "audio/mpeg", src: "invincible.mp3" },
                { type: "audio/ogg", src: "invincible.ogg" }
            ];

            // Setup buffer with the audio element
            var buffer = al.createBuffer();
            al.bufferData(buffer, audioRef, false);

            // Create the source
            var source = al.createSource();
            al.sourceBuffer(source, buffer);
            al.sourceParameter(source, al.LOOPING, true);

            // Start playback (looping)
            al.sourcePlay(source);

            // Gain slider
            var gainSlider = document.getElementById("gainSlider");
            gainSlider.value = al.getSourceParameter(source, al.GAIN) * 100.0;
            gainSlider.addEventListener("change", function () {
                al.sourceParameter(source, al.GAIN, gainSlider.value / 100.0);
            }, false);

            // X slider
            var xSlider = document.getElementById("xSlider");
            xSlider.value = al.getSourceParameter(source, al.POSITION)[0];
            xSlider.addEventListener("change", function () {
                var oldPosition = al.getSourceParameter(source, al.POSITION);
                al.sourceParameter(source, al.POSITION, [Number(xSlider.value), oldPosition[1], oldPosition[2]]);
            }, false);

            // Y slider
            var ySlider = document.getElementById("ySlider");
            ySlider.value = al.getSourceParameter(source, al.POSITION)[1];
            ySlider.addEventListener("change", function () {
                var oldPosition = al.getSourceParameter(source, al.POSITION);
                al.sourceParameter(source, al.POSITION, [oldPosition[0], Number(ySlider.value), oldPosition[2]]);
            }, false);

            // Z slider
            var zSlider = document.getElementById("zSlider");
            zSlider.value = al.getSourceParameter(source, al.POSITION)[2];
            zSlider.addEventListener("change", function () {
                var oldPosition = al.getSourceParameter(source, al.POSITION);
                al.sourceParameter(source, al.POSITION, [oldPosition[0], oldPosition[1], Number(zSlider.value)]);
            }, false);
        };
		