// src/components/charts/PerformanceChart.tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from 'flowbite-react';

const data = [
  { name: 'Ene', rendimiento: 65 }, { name: 'Feb', rendimiento: 59 },
  { name: 'Mar', rendimiento: 80 }, { name: 'Abr', rendimiento: 81 },
  { name: 'May', rendimiento: 56 }, { name: 'Jun', rendimiento: 55 },
  { name: 'Jul', rendimiento: 40 }, { name: 'Ago', rendimiento: 70 },
  { name: 'Sep', rendimiento: 85 }, { name: 'Oct', rendimiento: 90 },
  { name: 'Nov', rendimiento: 95 }, { name: 'Dic', rendimiento: 100 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-lg rounded-lg text-sm">
        <p className="font-bold text-gray-700 dark:text-gray-200">{label}</p>
        <p className="text-primary">
          Rendimiento: <span className="font-bold">{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function PerformanceChart() {
  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4">
        <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
          Rendimiento Anual
        </h5>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRendimiento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#646cff" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#646cff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10}/>
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="rendimiento" stroke="#646cff" strokeWidth={3} fillOpacity={1} fill="url(#colorRendimiento)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}