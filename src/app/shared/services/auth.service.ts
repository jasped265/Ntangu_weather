import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AuthPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:8000/api/v1';
  private readonly userStorageKey = 'ntangu_user';
  private readonly accessTokenKey = 'ntangu_access_token';
  private readonly refreshTokenKey = 'ntangu_refresh_token';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const stored = localStorage.getItem(this.userStorageKey);
    if (stored) {
      this.currentUserSubject.next(JSON.parse(stored));
      this.fetchMe().subscribe({
        next: (user) => this.setSession(user),
        error: () => this.clearSession(),
      });
    }
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<ApiResponse<AuthPayload>>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      map((res) => res.data),
      tap((payload) => this.setSession(payload.user, payload.access_token, payload.refresh_token)),
      map((payload) => payload.user),
      catchError((error) => {
        const message = error?.error?.message || 'Falha ao autenticar';
        return throwError(() => new Error(message));
      })
    );
  }

  register(name: string, email: string, password: string): Observable<AuthUser> {
    return this.http.post<ApiResponse<AuthPayload>>(`${this.baseUrl}/auth/register`, {
      name,
      email,
      password,
      terms: true,
    }).pipe(
      map((res) => res.data),
      tap((payload) => this.setSession(payload.user, payload.access_token, payload.refresh_token)),
      map((payload) => payload.user),
      catchError((error) => {
        const message = error?.error?.message || 'Falha ao criar conta';
        return throwError(() => new Error(message));
      })
    );
  }

  logout(): void {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    if (refreshToken) {
      this.http.post(`${this.baseUrl}/auth/logout`, { refresh_token: refreshToken }, { headers: this.authHeaders() })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.clearSession();
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  private fetchMe(): Observable<AuthUser> {
    return this.http.get<ApiResponse<AuthUser>>(`${this.baseUrl}/auth/me`, { headers: this.authHeaders() }).pipe(
      map((res) => res.data)
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private setSession(user: AuthUser, accessToken?: string, refreshToken?: string): void {
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
    if (accessToken) localStorage.setItem(this.accessTokenKey, accessToken);
    if (refreshToken) localStorage.setItem(this.refreshTokenKey, refreshToken);
    this.currentUserSubject.next(user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.userStorageKey);
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.currentUserSubject.next(null);
  }
}
