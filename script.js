var isDown = false;
var hScale = 2;
var vScale = 100;
var offset = 0;

var isPlaying = false;

var reader = new FileReader();
var audioContext = new AudioContext();
var bufferSource;
var audioBuffer;
var currentSample = 0;

var selection = 
{
    enabled: true,
    start: 0,
    end: 0,

    get firstSample()
    {
        return Math.min(this.start, this.end);
    },
    get lastSample()
    {
        return Math.max(this.start, this.end);
    },
    get length()
    {
        return this.lastSample - this.firstSample;
    }
}


var selectedTool = 0;

var button = document.querySelector("#loadButton");
var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
canvas.width = innerWidth - 20;



addEventListener("resize", e=>
{
    canvas.width = innerWidth - 20;
    render();
});
addEventListener("mousedown", e=> isDown = true);
addEventListener("mouseup", e=> isDown = false);

canvas.addEventListener("mousedown", e=> 
{
    if(selectedTool == 1)
    {
        let x = e.clientX - canvas.getBoundingClientRect().x;
        currentSample = Math.round(x/hScale + offset);
        selection.enabled = false;
        selection.start = currentSample;
        cursor.style.background = "black";
        render();
        updateTime();
        updateCursor();
    }
});

canvas.addEventListener("mousemove", e=>
{
    if(isDown)
    {
        switch(selectedTool)
        {
            case 0:
                offset -= Math.ceil(e.movementX/hScale);
                if(offset < 0)
                {
                    offset = 0;
                }
                break;
            case 1:
                {
                    let x = e.clientX - canvas.getBoundingClientRect().x;
                    currentSample = Math.round(x/hScale + offset);
                    selection.end = currentSample;
                    selection.enabled = true;
                }
                break;
        }
        render();
        updateCursor();
        updateTime();
    }
});
canvas.addEventListener("wheel", e=>
{
    e.preventDefault();
    if(e.wheelDelta > 0)
    {
        hScale *= 1.5;
    }
    else
    {
        hScale /= 1.5;
    }
    render();
    updateCursor();
});




var input = document.createElement("input");
input.type = "file";
button.addEventListener("click", e=>input.click());
input.addEventListener("change", e=>
{
    reader.readAsArrayBuffer(e.target.files[0]);
});

reader.addEventListener("load", e=>
{
    audioContext.decodeAudioData(reader.result, buffer=>
    {
        audioBuffer = buffer;
        render();
        updateTime();
        updateCursor();
    });

});

function render()
{
    if(!audioBuffer) return;

    var n = audioBuffer.numberOfChannels;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    if(selection.enabled)
    {
        ctx.fillRect((selection.firstSample - offset)*hScale, 0, (selection.lastSample - selection.firstSample)*hScale, canvas.height);
    }

    ctx.beginPath();
    for(let i=0; i<n; i++)
    {
        let data = audioBuffer.getChannelData(i);
        let y = (i+0.5)*canvas.height/n;


        ctx.moveTo(0,y);
        
        if(selection.enabled)
        {
            let selectionStart = selection.firstSample - offset;
            let selectionEnd = selection.lastSample - offset;

            for(let j=0; j<=selectionStart; j++)
            {
                ctx.lineTo(j*hScale, y - vScale*data[j + offset]);   
            }
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = "white";
            for(let j=selectionStart; j<=selectionEnd; j++)
            {
                ctx.lineTo(j*hScale, y - vScale*data[j + offset]); 
            }
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = "black";
            for(let j=selectionEnd; j<=canvas.width/hScale; j++)
            {
                ctx.lineTo(j*hScale, y - vScale*data[j + offset]);
            }
        }
        else
        {
            for(let j=0; j<canvas.width/hScale; j++)
            {
                ctx.lineTo(j*hScale, y - vScale*data[j + offset]);   
            }
        }
        
    }

    ctx.stroke();
    
}

function updateTime()
{
    var timer = document.querySelector("#timer");
    var seconds = currentSample/audioContext.sampleRate;

    timer.innerHTML = (""+Math.floor(seconds/60)).padStart(2,0) + ":" + (""+(seconds%60).toFixed(2)).padStart(5,0);
}

function updateCursor()
{

    var cursor = document.querySelector("#cursor");
    var currentX = hScale*(currentSample - offset);
    if(currentX < canvas.width)
    {
        cursor.style.left = currentX + "px";
    }
}

function play()
{
    if(!audioBuffer) return;

    isPlaying = true;

    var time = audioContext.currentTime;
    var firstSample = currentSample;

    bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(audioContext.destination);

    if(selection.enabled)
    {
        cursor.style.background = "white";
        firstSample = selection.firstSample;
        bufferSource.start(0,firstSample/audioContext.sampleRate,selection.length/audioContext.sampleRate);
    }
    else
    {
        bufferSource.start(0,firstSample/audioContext.sampleRate);
    }


    function update()
    {
        if(!isPlaying | currentSample>audioBuffer.length | (selection.enabled && currentSample>selection.lastSample))
        {
            currentSample = 0;
            cursor.style.background = "black";
            isPlaying = false;
            bufferSource = undefined;
        }
        else
        {
            currentSample = firstSample + (audioContext.currentTime - time)*audioContext.sampleRate;
            requestAnimationFrame(update);
        }
        updateTime();
        updateCursor();
    }

    setTimeout(update,10);

}

function pause()
{
    if(!bufferSource) return;

    bufferSource.stop();
    isPlaying = false;
}

function stop()
{
    pause();
    currentSample = 0;
    updateTime();
    updateCursor();
}