import { Component, ViewChild, ElementRef, signal, inject } from '@angular/core';
import Chart from 'chart.js/auto';
import { ApiService } from '../../api/api.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="p-8 bg-gray-50 min-h-screen">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
        >
          <div class="p-3 bg-blue-100 text-blue-600 rounded-xl">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              ></path>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Total Rooms</p>
            <h3 class="text-2xl font-bold">{{ stats()?.summary?.totalRooms }}</h3>
          </div>
        </div>

        <div
          class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
        >
          <div class="p-3 bg-green-100 text-green-600 rounded-xl">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Available Now</p>
            <h3 class="text-2xl font-bold">{{ stats()?.summary?.currentlyAvailable }}</h3>
          </div>
        </div>

        <div
          class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
        >
          <div class="p-3 bg-rose-100 text-rose-600 rounded-xl">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500 font-medium">Booked Now</p>
            <h3 class="text-2xl font-bold text-rose-600">
              {{ stats()?.summary?.currentlyBooked }}
            </h3>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 class="text-lg font-bold mb-4">Booking Trend (Last 7 Days)</h4>
          <canvas #trendCanvas></canvas>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 class="text-lg font-bold mb-4">Room Popularity</h4>
          <canvas #usageCanvas></canvas>
        </div>
        <div class="bg-white rounded-2xl shadow p-4 h-[400px] relative">
          <h4 class="text-lg font-bold mb-4">Top Bookers</h4>
          <canvas #userCanvas></canvas>
        </div>
      </div>
    </div>
  `,
})
export class Dashboard {
  @ViewChild('usageCanvas') usageCanvas!: ElementRef;
  @ViewChild('userCanvas') userCanvas!: ElementRef;
  @ViewChild('trendCanvas') trendCanvas!: ElementRef;

  private api = inject(ApiService);

  stats = signal<any>(null);
  private charts: Chart[] = [];

  ngOnInit() {
    this.loadStats();
  }

  async loadStats() {
    try {
      const data = await this.api.getDashboardStats();
      this.stats.set(data);
      this.initCharts();
    } catch (e) {
      console.error('Error loading stats', e);
    }
  }

  initCharts() {
    if (!this.stats()?.charts?.roomUsage?.labels || !this.stats()?.charts?.roomUsage?.data) {
      console.warn('Room usage data not ready yet', this.stats());
      return;
    }

    // Destroy previous charts to refresh cleanly
    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    // 1. Room Usage (Bar)
    this.charts.push(
      new Chart(this.usageCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: this.stats().charts.roomUsage.labels,
          datasets: [
            {
              label: 'Bookings',
              data: this.stats().charts.roomUsage.data,
              backgroundColor: '#6366f1',
            },
          ],
        },
      }),
    );

    // 2. Booking Trend (Line)
    this.charts.push(
      new Chart(this.trendCanvas.nativeElement, {
        type: 'line',
        data: {
          labels: this.stats().charts.trend.labels,
          datasets: [
            {
              label: 'Daily Bookings',
              data: this.stats().charts.trend.data,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.4,
            },
          ],
        },
      }),
    );

    // 3. Top Users (Doughnut)
    this.charts.push(
      new Chart(this.userCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: this.stats().charts.topUsers.labels,
          datasets: [
            {
              data: this.stats().charts.topUsers.data,
              backgroundColor: ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          radius: '75%',
          cutout: '60%',
          plugins: {
            legend: {
              position: 'top',
            },
          },
        },
      }),
    );
  }
}
