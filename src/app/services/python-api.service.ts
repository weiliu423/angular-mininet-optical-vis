import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap, take } from 'rxjs/operators';
import { file_upload, osnr_mapping_data } from '../models/osnr_mapping.model';


@Injectable({ providedIn: 'root' })
export class PythonApiService {
  private api = 'http://127.0.0.1:5000/';
  constructor(private http: HttpClient) {

  }

  getOSNRData() : Observable<osnr_mapping_data> {
    return this.http.get<osnr_mapping_data>(`${this.api}osnr`, {
        headers: new HttpHeaders().set('Access-Control-Allow-Origin', '*')})
      .pipe(
        take(1),
        catchError(err => of(err))
      );
  }

  uploadOSNRData(request: file_upload): Observable<file_upload> {
    return this.http.post<file_upload>(`${this.api}osnr`, request, {
        headers: new HttpHeaders().set('Access-Control-Allow-Origin', '*')})
      .pipe(
        take(1),
        catchError(err => of(err))
      );
  }

  getMonitorData() : Observable<[]> {
    return this.http.get<[]>(`${this.api}monitors`, {
        headers: new HttpHeaders().set('Access-Control-Allow-Origin', '*')})
      .pipe(
        take(1),
        catchError(err => of(err))
      );
  }

}