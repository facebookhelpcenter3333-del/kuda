class PermissionsManager {
  constructor() {
    this.locationGranted = false;
    this.cameraGranted = false;
    this.location = null;
    this.videoStream = null;
  }

  async requestLocationPermission() {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.locationGranted = true;
            this.location = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: new Date().toISOString()
            };
            localStorage.setItem('locationGranted', 'true');
            resolve(this.location);
          },
          (err) => {
            this.locationGranted = false;
            reject(new Error('Location denied: ' + err.message));
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  async requestCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      this.videoStream = stream;
      this.cameraGranted = true;
      localStorage.setItem('cameraGranted', 'true');
      return stream;
    } catch (err) {
      this.cameraGranted = false;
      throw new Error('Camera denied: ' + err.message);
    }
  }

  isLocationGranted() {
    return this.locationGranted || localStorage.getItem('locationGranted') === 'true';
  }

  isCameraGranted() {
    return this.cameraGranted || localStorage.getItem('cameraGranted') === 'true';
  }

  getLocation() {
    return this.location;
  }

  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(t => t.stop());
      this.videoStream = null;
    }
  }
}

const permissions = new PermissionsManager();
