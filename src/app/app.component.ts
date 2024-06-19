import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChild('imagePreview', { static: true })
  protected imagePreview!: ElementRef<HTMLCanvasElement>;

  private imagePreviewCtx!: CanvasRenderingContext2D | null;
  private worker!: Worker;

  ngOnInit() {
    this.imagePreviewCtx = this.imagePreview.nativeElement.getContext('2d');
    this.worker = new Worker(new URL('./image-filter.worker', import.meta.url));
    this.worker.onmessage = ({ data: processedImage }) => {
      this.imagePreviewCtx?.putImageData(processedImage, 0, 0);
    };
  }

  ngOnDestroy() {
    this.worker.terminate();
  }

  loadImage(e: Event) {
    const image = (e.target as HTMLInputElement).files![0];
    createImageBitmap(image).then((bitmap) => {
      this.imagePreview.nativeElement.width = bitmap.width;
      this.imagePreview.nativeElement.height = bitmap.height;
      this.imagePreviewCtx?.drawImage(bitmap, 0, 0);
    });
  }

  applyFilter() {
    const { width, height } = this.imagePreview.nativeElement;
    const imageData = this.imagePreviewCtx?.getImageData(0, 0, width, height);
    if (imageData) {
      this.worker.postMessage(imageData);
      const processedImage = crazyExpensiveImgFilter(imageData);
      this.imagePreviewCtx?.putImageData(processedImage, 0, 0);
    }
  }
}

function crazyExpensiveImgFilter(imageData: ImageData) {
  const { data, width, height } = imageData;

  // Apply color shift effect
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;

      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];

      // Shift the colors
      const newRed = (red + 100) % 256;
      const newGreen = (green + 50) % 256;
      const newBlue = (blue + 150) % 256;

      data[index] = newRed;
      data[index + 1] = newGreen;
      data[index + 2] = newBlue;
    }
  }

  // Apply blur effect
  const tempImageData = new Uint8ClampedArray(data);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1]; // Gaussian blur kernel
  const kernelSize = 3;

  for (let y = kernelSize; y < height - kernelSize; y++) {
    for (let x = kernelSize; x < width - kernelSize; x++) {
      const index = (y * width + x) * 4;

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kernelIndex = (ky + 1) * kernelSize + kx + 1;
          const pixelIndex = ((y + ky) * width + (x + kx)) * 4;

          rSum += tempImageData[pixelIndex] * kernel[kernelIndex];
          gSum += tempImageData[pixelIndex + 1] * kernel[kernelIndex];
          bSum += tempImageData[pixelIndex + 2] * kernel[kernelIndex];
        }
      }

      data[index] = rSum / 16;
      data[index + 1] = gSum / 16;
      data[index + 2] = bSum / 16;
    }
  }
  return imageData;
}
