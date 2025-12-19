import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Lun', rendimiento: 40 },
  { name: 'Mar', rendimiento: 30 },
  { name: 'Mie', rendimiento: 65 },
  { name: 'Jue', rendimiento: 50 },
  { name: 'Vie', rendimiento: 85 },
  { name: 'Sab', rendimiento: 95 },
  { name: 'Dom', rendimiento: 60 },
];

export default function PerformanceChart() {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md h-full min-h-[350px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Tendencia de Productividad</h3>
        <select className="bg-gray-50 border-none text-sm rounded-lg dark:bg-gray-700 dark:text-white focus:ring-indigo-500">
            <option>Esta semana</option>
            <option>Mes pasado</option>
        </select>
      </div>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRendimiento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#9CA3AF', fontSize: 12}} 
                dy={10}
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#9CA3AF', fontSize: 12}} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ color: '#E5E7EB' }}
            />
            <Area 
                type="monotone" 
                dataKey="rendimiento" 
                stroke="#4F46E5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRendimiento)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}