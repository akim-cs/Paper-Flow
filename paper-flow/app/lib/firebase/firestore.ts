import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Project, CreateProjectData, UpdateProjectData } from '@/app/types/project';

const PROJECTS_COLLECTION = 'projects';

export async function createProject(
  userId: string,
  data: CreateProjectData
): Promise<string> {
  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), {
    userId,
    name: data.name,
    extractedText: data.extractedText,
    config: data.config,
    slides: data.slides,
    ...(data.sections ? { sections: data.sections } : {}),
    originalFileName: data.originalFileName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getProject(projectId: string): Promise<Project | null> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    name: data.name,
    extractedText: data.extractedText,
    config: {
      ...data.config,
      researcherType: data.config.researcherType || 'author'
    },
    slides: data.slides,
    ...(data.sections ? { sections: data.sections } : {}),
    originalFileName: data.originalFileName,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      name: data.name,
      extractedText: data.extractedText,
      config: {
        ...data.config,
        researcherType: data.config.researcherType || 'author'
      },
      slides: data.slides,
      ...(data.sections ? { sections: data.sections } : {}),
      originalFileName: data.originalFileName,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    };
  });
}

export async function updateProject(
  projectId: string,
  data: UpdateProjectData
): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await deleteDoc(docRef);
}
