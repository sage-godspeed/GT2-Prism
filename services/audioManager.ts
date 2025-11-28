import { AudioSourceType } from '../types';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private monitorNode: GainNode | null = null; // Controls output to speakers
  private audioDataArray: Uint8Array = new Uint8Array(0);
  private currentStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;

  private smoothedVolume = 0;
  private readonly FFT_SIZE = 512;
  // Reduced from 0.85 to 0.8 to make visuals react faster to tempo changes
  private readonly SMOOTHING_TIME_CONSTANT = 0.8; 

  constructor() {
    // Initialize lazily to respect browser autoplay policies
  }

  public async initContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private reset() {
    try {
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      if (this.monitorNode) {
        this.monitorNode.disconnect();
        this.monitorNode = null;
      }
      // Don't close context, just suspend/reuse to avoid recreation overhead
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
        this.currentStream = null;
      }
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.audioElement = null;
      }
    } catch (e) {
      console.warn("Error during audio reset:", e);
    }
  }

  /**
   * Sets the audio source. 
   * @param type Source Type
   * @param file File object (optional)
   * @param shouldMonitor If true, audio is routed to speakers (destination). False prevents feedback.
   */
  public async setSource(type: AudioSourceType, file?: File, shouldMonitor: boolean = false): Promise<void> {
    try {
      await this.initContext();
      this.reset();
      if (!this.audioContext) throw new Error("AudioContext not initialized");

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.analyser.smoothingTimeConstant = this.SMOOTHING_TIME_CONSTANT;
      this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Create a Monitor Node (Gain) to control speaker output
      this.monitorNode = this.audioContext.createGain();
      this.monitorNode.gain.value = shouldMonitor ? 1 : 0;
      this.monitorNode.connect(this.audioContext.destination);

      if (type === AudioSourceType.MICROPHONE) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.currentStream = stream;
        this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      } 
      else if (type === AudioSourceType.BROWSER_TAB) {
        // Note: Browser tab capture often includes video track even if requested otherwise
        const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { width: 1, height: 1 } }); 
        this.currentStream = stream;
        
        if (stream.getAudioTracks().length === 0) {
           // User likely didn't check "Share Audio"
           // Stop the video track we just got
           stream.getTracks().forEach(t => t.stop());
           throw new Error("No audio track captured. Did you check 'Share Audio'?");
        }

        this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      } 
      else if (type === AudioSourceType.SYSTEM_FILE && file) {
        this.audioElement = new Audio();
        this.audioElement.src = URL.createObjectURL(file);
        this.audioElement.loop = true;
        await this.audioElement.play();
        
        this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
      }

      if (this.sourceNode && this.analyser && this.monitorNode) {
        // Connect Source -> Analyser (Visuals)
        this.sourceNode.connect(this.analyser);
        // Connect Source -> Monitor -> Destination (Speakers)
        this.sourceNode.connect(this.monitorNode);
      }

    } catch (err: any) {
      // Ensure we clean up if something failed partway through
      this.reset();
      
      // Categorize errors for logging
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message.includes('Permission denied')) {
          console.warn("Audio permission denied by user.");
      } else {
          console.error("AudioManager Error:", err);
      }
      throw err;
    }
  }

  public setMonitor(enabled: boolean) {
    if (this.monitorNode) {
      this.monitorNode.gain.setTargetAtTime(enabled ? 1 : 0, this.audioContext?.currentTime || 0, 0.1);
    }
  }

  public getAnalysis() {
    if (!this.analyser) {
      return { bass: 0, mid: 0, high: 0, volume: 0, frequencyData: new Uint8Array(0) };
    }

    this.analyser.getByteFrequencyData(this.audioDataArray);

    const length = this.audioDataArray.length;
    const bassEnd = Math.floor(length * 0.1);
    const midEnd = Math.floor(length * 0.4);
    
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;

    for (let i = 0; i < length; i++) {
      const val = this.audioDataArray[i];
      totalSum += val;
      if (i < bassEnd) bassSum += val;
      else if (i < midEnd) midSum += val;
      else highSum += val;
    }

    const bass = (bassSum / bassEnd) / 255;
    const mid = (midSum / (midEnd - bassEnd)) / 255;
    const high = (highSum / (length - midEnd)) / 255;
    const rawVol = (totalSum / length) / 255;

    this.smoothedVolume += (rawVol - this.smoothedVolume) * 0.1;

    return {
      bass,
      mid,
      high,
      volume: this.smoothedVolume,
      frequencyData: this.audioDataArray
    };
  }

  public stop() {
    this.reset();
    if (this.audioContext) {
      this.audioContext.suspend();
    }
  }
}
