import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'unique' })
export class UniquePipe implements PipeTransform {
  transform(value: any[]): number {
    if (!value) return 0;
    return new Set(value).size;
  }
}
