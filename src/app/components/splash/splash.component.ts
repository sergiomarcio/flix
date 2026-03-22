import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrl: './splash.component.scss'
})
export class SplashComponent implements OnInit {
  @Output() done = new EventEmitter<void>();

  visible = true;
  hiding = false;

  ngOnInit(): void {
    setTimeout(() => {
      this.hiding = true;
      setTimeout(() => {
        this.visible = false;
        this.done.emit();
      }, 700);
    }, 3000);
  }
}
