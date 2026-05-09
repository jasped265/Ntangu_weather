import { Component } from '@angular/core';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
  selectedYear = '2024';
  years = ['2024', '2023', '2022'];

  monthBars = [
    { month: 'JAN', height: 40, temp: 18 }, { month: 'FEV', height: 45, temp: 20 },
    { month: 'MAR', height: 55, temp: 23 }, { month: 'ABR', height: 70, temp: 26 },
    { month: 'MAI', height: 85, temp: 28 }, { month: 'JUN', height: 95, temp: 31 },
    { month: 'JUL', height: 80, temp: 29 }, { month: 'AGO', height: 65, temp: 27 },
    { month: 'SET', height: 50, temp: 24 }, { month: 'OUT', height: 40, temp: 21 },
    { month: 'NOV', height: 30, temp: 19 }, { month: 'DEZ', height: 20, temp: 17 },
  ];

  exports = [
    { name: 'Relatório_Q3_2024.pdf', type: 'pdf', icon: 'description', size: '4.2 MB', date: '14 Out' },
    { name: 'Dados_Vento_Set.csv', type: 'csv', icon: 'table_chart', size: '1.8 MB', date: '02 Out' },
    { name: 'Analise_Prec_Historica.pdf', type: 'pdf', icon: 'analytics', size: '5.5 MB', date: '28 Set' },
    { name: 'Clima_Sazonal_Resumo.pdf', type: 'pdf', icon: 'description', size: '3.1 MB', date: '15 Set' },
  ];

  exportCSV(): void { alert('Exportando CSV... (simulado)'); }
  exportPDF(): void { alert('Gerando PDF... (simulado)'); }
}
