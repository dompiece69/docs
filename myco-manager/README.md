# MycoManager - Smart Mushroom Cultivation Management System

## Overview
MycoManager is a comprehensive web application designed for small-scale specialty mushroom cultivators. It addresses critical pain points in the mushroom farming industry by providing automated monitoring, intelligent alerts, and data-driven insights for optimizing yields.

## Problem Solved
Small-scale mushroom farmers face several challenges:
- **Manual Environment Monitoring**: Constantly checking temperature, humidity, CO2 levels
- **Inconsistent Yields**: Lack of data-driven insights for optimization
- **Stage Management**: Difficulty tracking multiple batches through different growth phases
- **Market Timing**: Missing optimal harvest windows affects profitability
- **Record Keeping**: Paper-based systems make it hard to analyze trends

## Key Features

### 1. Batch Management
- Track multiple cultivation batches simultaneously
- Monitor different mushroom strains (Oyster, Shiitake, Lion's Mane, etc.)
- Automated stage progression tracking (inoculation → colonization → fruiting → harvest)
- Substrate type tracking for yield optimization

### 2. Environmental Monitoring
- Real-time temperature, humidity, CO2, and light tracking
- Automated anomaly detection with instant alerts
- Historical data visualization
- Manual entry support for non-IoT setups

### 3. Smart Alerts System
- Automatic notifications for environmental anomalies
- Stage transition reminders
- Severity-based alert categorization
- WebSocket-powered real-time updates

### 4. Analytics Dashboard
- Yield comparisons by strain
- Performance metrics tracking
- ROI calculations per batch
- Historical trend analysis

## Technical Stack
- **Backend**: Node.js with Express
- **Database**: SQLite (easily portable, no setup required)
- **Real-time Updates**: WebSocket for live monitoring
- **Frontend**: Vanilla JavaScript with Chart.js for visualizations
- **Scheduling**: node-cron for automated tasks

## Quick Start

1. Install dependencies:
```bash
cd myco-manager
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

## API Integration
The system is designed to integrate with IoT sensors. Send environmental data via POST to `/api/environment`:

```json
{
  "batch_id": 1,
  "temperature": 68.5,
  "humidity": 85,
  "co2_level": 800,
  "light_hours": 12
}
```

## Market Opportunity
- The specialty mushroom market is growing at 9.5% CAGR
- Small-scale cultivators are underserved by existing agricultural software
- Most solutions are either too expensive or designed for large operations
- MycoManager fills this gap with an affordable, user-friendly solution

## Future Enhancements
- Mobile app for on-the-go monitoring
- IoT sensor package integration
- Marketplace connections for direct sales
- AI-powered yield predictions
- Multi-language support for global markets

## Revenue Model
- Freemium: Basic features free, premium analytics and unlimited batches
- Hardware partnerships: Bundle with IoT sensor kits
- Data insights: Anonymized aggregate data for market research
- B2B licensing: White-label for agricultural suppliers