import { LessThan, Not } from 'typeorm';
import { AppDataSource as db } from '../config/data-source';
import { ProjectDocument } from '../entities/ProjectAssets';
import { chatStorageService } from '../services/ChatStorageService';
async function main() {
 db.setOptions({synchronize:false});await db.initialize();
 try {
  const pending=await db.getRepository(ProjectDocument).createQueryBuilder('d').addSelect('d.storageKey').where('d.status != :ready AND d.createdAt < :expiry',{ready:'ready',expiry:new Date(Date.now()-86400000)}).getMany();
  for(const d of pending){await chatStorageService.remove(d.storageKey);await db.getRepository(ProjectDocument).delete({id:d.id,status:Not('ready')});}
  console.log(`Cleaned ${pending.length} expired document uploads`);
 }finally{await db.destroy();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
