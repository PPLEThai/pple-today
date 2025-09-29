import os
import time

print('Enter migration name:', end=" ")
migration_name = input()
current_time = time.gmtime()
date_time_str = time.strftime("%Y%m%d%H%M%S", current_time)
folder_name = f'{date_time_str}_{migration_name}'

new_folder_path = os.path.join(os.path.dirname(__file__), '../migrations', folder_name)

os.makedirs(new_folder_path, exist_ok=True)

path = os.path.dirname(__file__)

final_result = []
final_result.append(f'-- Migration: {migration_name} --')

for entry in os.scandir(path):
  if entry.is_dir():
    for sql_file in os.scandir(entry.path):
      if sql_file.name.endswith('.sql'):
        with open(sql_file.path, 'r') as f:
          final_result.append(f'-- {sql_file.name} --')
          final_result.append(f"DROP FUNCTION IF EXISTS {sql_file.name[:-4]};")
          final_result.append(f"{f.read().strip()};")

with open(f'{new_folder_path}/migration.sql', 'w') as f:
  f.write('\n\n'.join(final_result))

print(f'Writing to {new_folder_path}/migration.sql')
print('Please run pnpm db:migrate to apply the migration.')