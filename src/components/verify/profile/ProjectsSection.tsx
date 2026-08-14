/* eslint-disable react/no-unescaped-entities */

/**
 * ProjectsSection
 * ---------------
 * "Projects & Live Demos" — recruiter-friendly showcase of the
 * candidate's project work. Each project surfaces name, description,
 * technologies, role, and (when present) live demo / GitHub links.
 *
 * Source: payload.projects. The backend already strips any
 * private evidence / admin notes — only the publicly intended
 * fields are returned.
 *
 * Hidden entirely when there are no projects.
 */

import React from 'react';
import { Rocket, ExternalLink, Github, Globe, Folder, Wrench } from 'lucide-react';
import { Section, normaliseProject, safeStr } from './profileHelpers';

interface Props {
  payload: any;
}

export function ProjectsSection({ payload }: Props) {
  const raw = Array.isArray(payload?.projects) ? payload.projects : [];
  if (raw.length === 0) return null;

  const projects = raw.map(normaliseProject).filter((p) => p.name);

  if (projects.length === 0) return null;

  return (
    <Section
      id="projects"
      eyebrow="Projects"
      title="Projects & Live Demos"
      icon={<Rocket className="h-4 w-4" />}
      helper={`${projects.length} public project${projects.length === 1 ? '' : 's'} on the candidate\u2019s profile.`}
      badge={`${projects.length}`}
    >
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {projects.map((p, idx) => (
          <li
            key={`${p.name}-${idx}`}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            {p.image ? (
              <div className="relative h-36 w-full bg-slate-100">
                <img
                  src={p.image}
                  alt={p.name ?? 'Project image'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex h-1.5 w-full bg-gradient-to-r from-[#E31B23] via-[#F97316] to-amber-300" aria-hidden />
            )}

            <div className="flex flex-1 flex-col p-4">
              <p className="text-sm font-black text-slate-900 break-words">
                {p.name}
              </p>
              {p.role ? (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <Folder className="h-3 w-3" /> {p.role}
                </p>
              ) : null}
              {p.description ? (
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-700 break-words">
                  {p.description}
                </p>
              ) : null}
              {p.technologies.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.technologies.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                    >
                      <Wrench className="h-2.5 w-2.5" /> {t}
                    </span>
                  ))}
                </div>
              ) : null}

              {p.url ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-[#E31B23] hover:text-[#E31B23]"
                  >
                    <Globe className="h-3 w-3" /> Live Demo
                  </a>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-[#E31B23] hover:text-[#E31B23]"
                  >
                    <ExternalLink className="h-3 w-3" /> View Project
                  </a>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}