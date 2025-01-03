import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as ExifReader from 'exifreader';

const Map = () => {
  const mapDiv = useRef(null);
  const map = useRef(null);
  const [features, setFeatures] = useState([])

  useEffect(() => {
    // Dynamically add Mapbox CSS
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    // Initialize Mapbox map on load
    if (map.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoiY29uZXhvbi1kZXNpZ24iLCJhIjoiY2pvdzZlb2djMXVhOTN3bmhpYzk3NndoZCJ9.On4IrAd0sgmmgd_sAqg_Gg';
    map.current = new mapboxgl.Map({
      container: mapDiv.current,
      style: 'mapbox://styles/conexon-design/ckgb6lfyh42h419mpqdkszki1',
      center: [-105.3272, 39.0639],
      zoom: 6.5,
    });

    map.current.addControl(new mapboxgl.NavigationControl());
  }, []);

  const fetchImagesAsArrayBuffer = async () => {
    const apiUrl = `https://api.github.com/repos/allisonshill/map/contents/public/images`;
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (Array.isArray(data)) {
        const buffers = await Promise.all(
          data
            .map(async (file) => {
              const imageResponse = await fetch(file.download_url);
              if (!imageResponse.ok) throw new Error(`Failed to fetch ${file.name}`);
              return imageResponse.arrayBuffer(); // Convert the response to ArrayBuffer
            })
        );
        const theFeatures = [];
        for (const [i, buffer] of buffers.entries()) {
          const exifData = ExifReader.load(buffer);
  
          // Assuming `data` is the original array from the API
          const file = data[i];
          const imageUrl = URL.createObjectURL(new Blob([buffer]));
  
          const formattedDate = exifData['DateTimeOriginal']?.description
            ? new Date(`${exifData['DateTimeOriginal']?.description.split(' ')[0].replace(/:/g, '-')} ${exifData['DateTimeOriginal']?.description.split(' ')[1]}`).toLocaleString('en-US')
            : 'Date not available';
  
          // Create GeoJSON feature from EXIF coordinates
          if (exifData['GPSLongitude']?.description) {
            theFeatures.push({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [
                  -exifData['GPSLongitude']?.description || 0,
                  exifData['GPSLatitude']?.description || 0
                ]
              },
              properties: {
                image: imageUrl,
                date: formattedDate
              }
            });
          } else {
            console.log('NO DATA:', file.name, formattedDate);
          }
        }
        console.log(theFeatures)
        setFeatures(theFeatures)
      } else {
        console.error('Failed to fetch image list:', data);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  useEffect(() => {
    fetchImagesAsArrayBuffer();
  }, []);

  useEffect(() => {
    if (map.current && features.length) {
      const source = map.current.getSource('points');
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: features
        });
      } else {
        map.current.addSource('points', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: features
          }
        });

        map.current.addLayer({
          id: 'points',
          type: 'circle',
          source: 'points',
          paint: {
            'circle-radius': 5,
            'circle-color': '#007cbf'
          }
        });
      }
    }

    // Add click event listener to display popup with image
      map.current.on('click', 'points', (e) => {
        new mapboxgl.Popup()
          .setLngLat(e.features[0].geometry.coordinates.slice())
          .setHTML(`
          <div style="">
          <img src="${e.features[0].properties.image}" alt="Image" style="width:300px; height:auto;"/>
          <p>${e.features[0].properties.date}</p>
          </div>
          `)
          .addTo(map.current);
      });

      // Change the cursor to a pointer when hovering over points
      map.current.on('mouseenter', 'points', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'points', () => {
        map.current.getCanvas().style.cursor = '';
      });
  }, [features]);

  return (
    <>
      <div ref={mapDiv} style={{ width: '100%', height: '100vh' }} />
    </>
  );
};

export default Map;
