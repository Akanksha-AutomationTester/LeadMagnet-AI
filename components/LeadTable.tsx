
import React from 'react';
import { Lead } from '../types';
import { ExternalLink, Star, Mail, Globe, Phone, Users } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
}

export const LeadTable: React.FC<LeadTableProps> = ({ leads }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Hot': return 'bg-rose-100 text-rose-700';
      case 'Warm': return 'bg-amber-100 text-amber-700';
      case 'Cold': return 'bg-slate-100 text-slate-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 md:px-8 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Business</th>
              <th className="px-4 md:px-8 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Contact</th>
              <th className="hidden sm:table-cell px-4 md:px-8 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Category</th>
              <th className="px-4 md:px-8 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Stats</th>
              <th className="px-4 md:px-8 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-16 md:py-20 text-center text-slate-400">
                   <div className="flex flex-col items-center">
                     <Users size={32} className="mb-4 text-slate-200" />
                     <p className="font-medium text-sm">No leads captured yet.</p>
                   </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="px-4 md:px-8 py-4 min-w-[150px]">
                    <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{lead.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center">
                      <Globe size={10} className="mr-1" /> {lead.city}
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-4 space-y-1 min-w-[200px]">
                    <div className="flex items-center text-[11px] text-slate-600 font-medium">
                      <Phone size={10} className="mr-1.5 text-slate-400" /> {lead.phone}
                    </div>
                    {lead.email && lead.email !== 'n/a' && (
                      <div className="flex items-center text-[11px] text-indigo-600 font-medium truncate max-w-[180px]">
                        <Mail size={10} className="mr-1.5 text-indigo-400" />
                        <a href={`mailto:${lead.email}`} className="hover:underline truncate">{lead.email}</a>
                      </div>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-4 md:px-8 py-4">
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-lg whitespace-nowrap">
                      {lead.category}
                    </span>
                  </td>
                  <td className="px-4 md:px-8 py-4">
                    <div className="flex items-center text-amber-500">
                      <Star size={10} fill="currentColor" className="mr-1" />
                      <span className="text-[11px] font-bold">{lead.rating}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusStyle(lead.leadStatus)} whitespace-nowrap`}>
                      {lead.leadStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
