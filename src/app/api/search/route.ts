import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    const API_KEY = 'AIzaSyDwKifHmwQfQfnMNaB9t_3_n5hm3cmAeQ4';
    const CX = 'c433d6136c67f437d';

    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query!)}&num=10`;

    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json(data);
}